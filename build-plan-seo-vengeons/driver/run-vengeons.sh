#!/usr/bin/env bash
# Detached Grok Build driver for the Vengeons SEO pass.
set -u
export PATH="$HOME/.local/bin:$PATH"
unset GROK_HOME GROK_SANDBOX CI || true

REPO=/workspace/kio-seo-imagine
PLAN=$REPO/build-plan-seo-vengeons
PROMPTS=$PLAN/prompts
LOGDIR=$PLAN/logs
STATE=$PLAN/state.json
RUNLOG=$PLAN/run.log
LOCK=$PLAN/driver.pid
PAUSE=$PLAN/PAUSE
STOP=$PLAN/STOP
BRANCH=seo/vengeons-pass
GROK=$(command -v grok)
MODEL_DEFAULT=grok-4.7-build-fast
STALL_MIN=45
POLL=15
MAX_TURNS_BUILD=80
MAX_TURNS_CHECKPOINT=40

mkdir -p "$LOGDIR"
cd "$REPO" || exit 1

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $*" | tee -a "$RUNLOG"; }
now_iso() { date -Iseconds; }

if [[ -f "$LOCK" ]]; then
  old=$(cat "$LOCK" 2>/dev/null || true)
  if [[ -n "$old" ]] && kill -0 "$old" 2>/dev/null; then
    log "REFUSE: driver already running pid=$old"
    exit 1
  fi
fi
echo $$ >"$LOCK"
trap 'rm -f "$LOCK"' EXIT

# Ensure branch
cur=$(git rev-parse --abbrev-ref HEAD)
if [[ "$cur" != "$BRANCH" ]]; then
  log "REFUSE: on $cur expected $BRANCH"
  exit 1
fi

# Init state
if [[ ! -f "$STATE" ]]; then
  printf '{"status":"idle","current":"","prompts":{},"updated":"%s","pid":%s}\n' "$(now_iso)" "$$" >"$STATE"
fi

save_state() {
  python3 - "$STATE" "$@" <<'PY'
import json,sys,datetime
path=sys.argv[1]
kv=dict(zip(sys.argv[2::2], sys.argv[3::2]))
with open(path) as f: st=json.load(f)
for k,v in kv.items():
    if k.startswith('p.'):
        pid,field=k[2:].split('.',1)
        st.setdefault('prompts',{}).setdefault(pid,{})[field]=v
    else:
        st[k]=v
st['updated']=datetime.datetime.now().astimezone().isoformat(timespec='seconds')
st['pid']=int(open('/workspace/kio-seo-imagine/build-plan-seo-vengeons/driver.pid').read().strip() or 0)
with open(path,'w') as f: json.dump(st,f,indent=2)
PY
}

prompt_status() {
  python3 - "$STATE" "$1" <<'PY'
import json,sys
st=json.load(open(sys.argv[1]))
print(st.get('prompts',{}).get(sys.argv[2],{}).get('status',''))
PY
}

map_model() {
  case "$1" in
    grok-build|grok-4.7-build-fast|fast) echo grok-4.7-build-fast ;;
    grok-4.7|xhigh|high) echo grok-4.7 ;;
    *) echo grok-4.7-build-fast ;;
  esac
}

map_effort() {
  case "$1" in
    xhigh|extra*) echo xhigh ;;
    high) echo high ;;
    medium|med) echo medium ;;
    low) echo low ;;
    *) echo high ;;
  esac
}

DRIVER_RULES="You are running headless under an automated build driver in $REPO on branch $BRANCH. Read build-plan-seo-vengeons/CONTEXT.md first and obey it. Never git push, never touch remotes, never switch to main/master, never deploy or talk to Hostinger/DNS/live kr8tiv.io. Do not edit build-plan-seo-vengeons/driver, prompts, CONTEXT.md or INDEX.md. Never print or commit secrets. When done, commit with the exact Commit message from the prompt and leave the working tree clean. Nobody can answer questions: make the reasonable choice, note it in the commit body, keep going."

DENY=(
  'Bash(*git push*)' 'Bash(*git remote*)' 'Bash(*git reset --hard*)' 'Bash(*git clean -*)'
  'Bash(*git checkout main*)' 'Bash(*git checkout master*)' 'Bash(*git switch main*)' 'Bash(*git switch master*)'
  'Bash(*git branch -D*)' 'Bash(*--force*)' 'Bash(*hostinger*)' 'Bash(*hpanel*)' 'Bash(*vercel*)' 'Bash(*netlify deploy*)'
  'Bash(*wrangler*)' 'Bash(*gh pr*)' 'Bash(*gh release*)' 'Bash(*grok login*)' 'Bash(*grok logout*)'
  'Read(**/.grok/auth*)' 'Read(**/.env)' 'Read(**/.env.*)'
  'Edit(**/build-plan-seo-vengeons/driver/**)' 'Edit(**/build-plan-seo-vengeons/prompts/**)'
  'Write(**/build-plan-seo-vengeons/driver/**)' 'Write(**/build-plan-seo-vengeons/prompts/**)'
  'Edit(**/build-plan-seo-vengeons/CONTEXT.md)' 'Write(**/build-plan-seo-vengeons/CONTEXT.md)'
)

run_one() {
  local file="$1"
  local base=$(basename "$file" .md)
  local id="$base"
  local st
  st=$(prompt_status "$id")
  if [[ "$st" == "DONE" || "$st" == "SKIPPED" ]]; then
    log "SKIP $id already $st"
    return 0
  fi

  # Parse front matter lightly
  local effort model kind msg
  effort=$(awk '/^effort:/{print $2; exit}' "$file")
  model=$(awk '/^model:/{print $2; exit}' "$file")
  kind=$(awk '/^kind:/{print $2; exit}' "$file")
  msg=$(awk '/^## commit message/{getline; gsub(/^`|`$/,""); print; exit}' "$file")
  [[ -z "$msg" ]] && msg="chore(seo): $id"
  local MODEL EFFORT TURNS
  MODEL=$(map_model "$model")
  EFFORT=$(map_effort "$effort")
  if [[ "$kind" == "checkpoint" || "$kind" == "review" ]]; then TURNS=$MAX_TURNS_CHECKPOINT; else TURNS=$MAX_TURNS_BUILD; fi

  # depends_on
  local deps
  deps=$(python3 - "$file" <<'PY'
import sys,re
text=open(sys.argv[1]).read().split('---',2)
if len(text)<3: print(''); sys.exit(0)
fm=text[1]
m=re.search(r'depends_on:\s*\[([^\]]*)\]',fm)
if not m: print(''); sys.exit(0)
items=[x.strip().strip('"').strip("'") for x in m.group(1).split(',') if x.strip()]
print(' '.join(items))
PY
)
  for d in $deps; do
    local ds
    ds=$(prompt_status "$d")
    if [[ "$ds" == "BLOCKED" || "$ds" == "SKIPPED" ]]; then
      log "SKIP $id because dependency $d is $ds"
      save_state p.$id.status SKIPPED p.$id.reason "dep $d $ds"
      return 0
    fi
    if [[ "$ds" != "DONE" ]]; then
      log "WAIT $id dependency $d not DONE ($ds) — treating as missing; will run anyway only if empty"
      if [[ -n "$ds" ]]; then
        log "BLOCK $id unmet dep $d=$ds"
        save_state p.$id.status BLOCKED p.$id.reason "unmet dep $d"
        return 1
      fi
    fi
  done

  if [[ -f "$STOP" ]]; then log "STOP file present before $id"; save_state status stopped current ""; return 2; fi
  while [[ -f "$PAUSE" ]]; do log "PAUSED before $id"; sleep 30; done

  log "START $id model=$MODEL effort=$EFFORT turns=$TURNS"
  save_state status running current "$id" p.$id.status RUNNING p.$id.started "$(now_iso)"

  local prompt_body
  prompt_body=$(mktemp)
  {
    echo "Read and obey build-plan-seo-vengeons/CONTEXT.md and build-plan-seo-vengeons/INDEX.md."
    echo "Execute ONLY this prompt file: build-plan-seo-vengeons/prompts/$(basename "$file")"
    echo
    cat "$file"
  } >"$prompt_body"

  local out="$LOGDIR/${id}.log"
  local err="$LOGDIR/${id}.err.log"
  : >"$out"; : >"$err"

  local args=( -p "$(cat "$prompt_body")" -m "$MODEL" --effort "$EFFORT" --output-format streaming-json --always-approve --sandbox workspace --cwd "$REPO" --max-turns "$TURNS" --rules "$DRIVER_RULES" )
  for d in "${DENY[@]}"; do args+=( --deny "$d" ); done

  # Prefer --prompt-file if prompt is huge
  local pf_args=()
  if [[ $(wc -c <"$prompt_body") -gt 18000 ]]; then
    args=( --prompt-file "$prompt_body" -m "$MODEL" --effort "$EFFORT" --output-format streaming-json --always-approve --sandbox workspace --cwd "$REPO" --max-turns "$TURNS" --rules "$DRIVER_RULES" )
    for d in "${DENY[@]}"; do args+=( --deny "$d" ); done
  fi

  (
    "$GROK" "${args[@]}" < /dev/null >"$out" 2>"$err"
  ) &
  local gpid=$!
  save_state p.$id.grok_pid "$gpid"

  local last_size=0 idle=0
  while kill -0 "$gpid" 2>/dev/null; do
    sleep "$POLL"
    local sz
    sz=$(stat -c%s "$out" 2>/dev/null || echo 0)
    if [[ "$sz" -gt "$last_size" ]]; then last_size=$sz; idle=0; else idle=$((idle+POLL)); fi
    if (( idle >= STALL_MIN*60 )); then
      log "STALL $id killing grok pid=$gpid after ${STALL_MIN}m idle"
      kill "$gpid" 2>/dev/null || true
      sleep 2
      kill -9 "$gpid" 2>/dev/null || true
      break
    fi
    if [[ -f "$STOP" ]]; then
      log "STOP requested during $id — letting session finish"
    fi
  done
  wait "$gpid" || true
  rm -f "$prompt_body"

  # Detect usage / 402
  if rg -qi '402|usage limit|insufficient|out of credits|balance' "$out" "$err" 2>/dev/null; then
    log "BLOCKED $id usage/balance"
    save_state status blocked current "$id" p.$id.status BLOCKED p.$id.reason usage
    return 3
  fi

  # Leftover commit if dirty
  if [[ -n $(git status --porcelain) ]]; then
    log "COMMIT leftovers for $id"
    git add -A
    git commit -m "$msg" -m "Driver leftover commit after Grok session $id." || true
  fi

  # Soft verify: npm run build when package exists
  if [[ -f package.json ]]; then
    if ! npm run build >"$LOGDIR/${id}.build.log" 2>&1; then
      log "BUILD FAIL $id — marking BLOCKED"
      save_state p.$id.status BLOCKED p.$id.reason build_fail status blocked current "$id"
      return 1
    fi
  fi

  local head
  head=$(git rev-parse --short HEAD)
  log "DONE $id at $head"
  save_state p.$id.status DONE p.$id.head "$head" p.$id.finished "$(now_iso)" current "" status idle
  return 0
}

log "DRIVER start pid=$$ branch=$(git rev-parse --abbrev-ref HEAD) head=$(git rev-parse --short HEAD) grok=$GROK"
save_state status starting

mapfile -t FILES < <(ls -1 "$PROMPTS"/[0-9][0-9][0-9]-*.md | sort)
for f in "${FILES[@]}"; do
  run_one "$f"
  rc=$?
  if [[ $rc -eq 2 ]]; then log "STOPPED by STOP file"; break; fi
  if [[ $rc -eq 3 ]]; then log "STOPPED on usage limit"; break; fi
  # continue on BLOCKED so later independent prompts can still run? INDEX is sequential — stop on hard block
  st=$(prompt_status "$(basename "$f" .md)")
  if [[ "$st" == "BLOCKED" ]]; then
    log "Stopping queue after BLOCKED $(basename "$f" .md)"
    break
  fi
done

# Push feature branch only (not main)
log "Pushing $BRANCH (never main)"
git push -u origin "$BRANCH" 2>&1 | tee -a "$RUNLOG" || log "WARN: push failed"

log "DRIVER finished status=$(python3 -c "import json;print(json.load(open('$STATE')).get('status'))")"
save_state status finished current ""
