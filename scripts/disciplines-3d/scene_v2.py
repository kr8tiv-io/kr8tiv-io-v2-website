# KR8TIV disciplines v2: whimsical, site-vibe objects (moons, ridge-line peaks, halos, sparkles,
# pearl chrome, thin-film glass). Usage: blender -b -P scene_v2.py -- <name> <outdir> <N> <samples> <res> [frames]
import bpy, bmesh, math, sys, os, random
from mathutils import Vector, Matrix, noise

argv = sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
NAME = argv[0] if argv else 'laptop'
OUT = argv[1] if len(argv) > 1 else '/tmp/r'
N = int(argv[2]) if len(argv) > 2 else 96
SAMPLES = int(argv[3]) if len(argv) > 3 else 40
RES = int(argv[4]) if len(argv) > 4 else 640
ONLY = argv[5] if len(argv) > 5 else ''
TAU = math.tau

bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene
col = scn.collection

def hexc(h, a=1.0):
    h = h.lstrip('#'); c = [int(h[i:i+2], 16)/255 for i in (0, 2, 4)]
    lin = [x/12.92 if x <= 0.04045 else ((x+0.055)/1.055)**2.4 for x in c]
    return (*lin, a)

# site palette (core.css --accent-1..4 + blend.css cyan)
MAG, PUR, RED, GOLD, CYAN, LILAC = '#ff6ad5', '#8e00ff', '#ff2d4a', '#ffd166', '#00d1ff', '#efe9ff'

def principled(name, base='#000000', metal=0.0, rough=0.1, trans=0.0, ior=1.45, coat=0.0, emis=None, estr=0.0,
               spec=0.5, film=0.0, film_ior=1.33, sheen=0.0, sheen_tint='#ffffff', coat_tint='#ffffff'):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']; I = b.inputs
    I['Base Color'].default_value = hexc(base); I['Metallic'].default_value = metal
    I['Roughness'].default_value = rough; I['Transmission Weight'].default_value = trans
    I['IOR'].default_value = ior; I['Coat Weight'].default_value = coat; I['Coat Tint'].default_value = hexc(coat_tint)
    I['Specular IOR Level'].default_value = spec
    I['Thin Film Thickness'].default_value = film; I['Thin Film IOR'].default_value = film_ior
    I['Sheen Weight'].default_value = sheen; I['Sheen Tint'].default_value = hexc(sheen_tint)
    if emis:
        I['Emission Color'].default_value = hexc(emis); I['Emission Strength'].default_value = estr
    return m

def glow(name, c, s): return principled(name, '#000000', emis=c, estr=s)

M = {
 'pearl':     principled('pearl', '#e4dcf2', metal=1.0, rough=0.2, film=430, film_ior=1.45),
 'pearl_s':   principled('pearl_s', '#d6cfe6', metal=1.0, rough=0.34, film=520, film_ior=1.4),
 'obsidian':  principled('obsidian', '#0b0a12', rough=0.08, coat=1.0, spec=0.9, film=260, film_ior=1.6),
 'obsidian_m':principled('obsidian_m', '#15121c', rough=0.32, spec=0.7),
 'velvet':    principled('velvet', '#0d0614', rough=0.45, sheen=0.55, sheen_tint='#ff6ad5', spec=0.5, coat=0.4, film=280),
 'gold':      principled('gold', '#f4c766', metal=1.0, rough=0.14),
 'gold_b':    principled('gold_b', '#d9a441', metal=1.0, rough=0.3),
 'glass':     principled('glass', '#ffffff', rough=0.015, trans=1.0, ior=1.5, film=340, film_ior=1.38),
 'glass_lilac': principled('glass_lilac', '#d9c2ff', rough=0.02, trans=1.0, ior=1.5, film=300),
 'glass_mag': principled('glass_mag', '#ffb8ec', rough=0.02, trans=1.0, ior=1.5, film=380),
 'glass_cyan':principled('glass_cyan', '#a8ecff', rough=0.02, trans=1.0, ior=1.5, film=320),
 'glass_frost': principled('glass_frost', '#f3eaff', rough=0.22, trans=1.0, ior=1.45, film=300),
 'tissue':    principled('tissue', '#f7c8ee', rough=0.45, sheen=1.0, sheen_tint='#ff6ad5', film=360, emis='#ff6ad5', estr=0.25),
 'wax':       principled('wax', '#6e0313', rough=0.26, coat=0.8, spec=0.5, emis='#c8102e', estr=0.08, sheen=0.4, sheen_tint='#ff2d4a'),
 'g_mag': glow('g_mag', MAG, 4.0), 'g_red': glow('g_red', RED, 4.0), 'g_pur': glow('g_pur', '#a43cff', 4.0),
 'g_cyan': glow('g_cyan', CYAN, 3.0), 'g_gold': glow('g_gold', GOLD, 3.0), 'g_white': glow('g_white', LILAC, 6.0),
}

def nodes_helper(nt):
    N_ = nt.nodes.new; L = nt.links.new
    def mth(op, a, b=None, clamp=False):
        n = N_('ShaderNodeMath'); n.operation = op; n.use_clamp = clamp
        for k, v in enumerate((a, b)):
            if v is None: continue
            if isinstance(v, (int, float)): n.inputs[k].default_value = v
            else: L(v, n.inputs[k])
        return n.outputs[0]
    return N_, L, mth

def moon_mat(name='moon', tint='#e9e5f3', glowc=LILAC, gs=0.12):
    """cratered pearl moon, softly self-lit so it reads on black (site has moons everywhere)."""
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree
    b = nt.nodes['Principled BSDF']; N_, L, mth = nodes_helper(nt)
    tc = N_('ShaderNodeTexCoord')
    vor = N_('ShaderNodeTexVoronoi'); vor.feature = 'DISTANCE_TO_EDGE'; vor.inputs['Scale'].default_value = 5.5
    L(tc.outputs['Object'], vor.inputs['Vector'])
    noi = N_('ShaderNodeTexNoise'); noi.inputs['Scale'].default_value = 7; noi.inputs['Detail'].default_value = 8
    L(tc.outputs['Object'], noi.inputs['Vector'])
    ramp = N_('ShaderNodeValToRGB'); ramp.color_ramp.elements[0].color = hexc('#8f8aa6'); ramp.color_ramp.elements[1].color = hexc(tint)
    L(noi.outputs['Fac'], ramp.inputs[0]); L(ramp.outputs[0], b.inputs['Base Color'])
    bump = N_('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.45; bump.inputs['Distance'].default_value = 0.02
    L(mth('ADD', mth('MULTIPLY', vor.outputs['Distance'], 0.8), mth('MULTIPLY', noi.outputs['Fac'], 0.4)), bump.inputs['Height'])
    L(bump.outputs[0], b.inputs['Normal'])
    b.inputs['Roughness'].default_value = 0.7
    b.inputs['Emission Color'].default_value = hexc(glowc); b.inputs['Emission Strength'].default_value = gs
    b.inputs['Sheen Weight'].default_value = 0.6; b.inputs['Sheen Tint'].default_value = hexc(MAG)
    return m

def ridge_mat(name, hmax, freq=55.0, axis='Y', base='#0a0916', linec=LILAC, lstr=3.2, tipc=MAG, sheen=1.0, floor=0.08):
    """the site's signature: scan-line ridges on dark terrain, brighter toward the peaks."""
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree
    b = nt.nodes['Principled BSDF']; N_, L, mth = nodes_helper(nt)
    b.inputs['Base Color'].default_value = hexc(base); b.inputs['Roughness'].default_value = 0.35
    b.inputs['Sheen Weight'].default_value = sheen; b.inputs['Sheen Tint'].default_value = hexc('#b69cff')
    tc = N_('ShaderNodeTexCoord'); sep = N_('ShaderNodeSeparateXYZ'); L(tc.outputs['Object'], sep.inputs[0])
    d = mth('ABSOLUTE', mth('SUBTRACT', mth('FRACT', mth('MULTIPLY', sep.outputs[axis], freq)), 0.5))
    line = mth('POWER', mth('SUBTRACT', 1.0, mth('MULTIPLY', d, 2.0), clamp=True), 9.0)
    h = mth('DIVIDE', sep.outputs['Z'], hmax); hc = mth('MINIMUM', mth('MAXIMUM', h, 0.0), 1.0)
    s = mth('MULTIPLY', line, mth('ADD', floor, mth('POWER', hc, 1.4)))
    cr = N_('ShaderNodeValToRGB'); cr.color_ramp.elements[0].color = hexc(PUR); cr.color_ramp.elements[1].color = hexc(linec)
    e = cr.color_ramp.elements.new(0.75); e.color = hexc(linec)
    e2 = cr.color_ramp.elements.new(0.97); e2.color = hexc(tipc)
    cr.color_ramp.elements[0].position = 0.0
    L(hc, cr.inputs[0]); L(cr.outputs[0], b.inputs['Emission Color'])
    L(mth('MULTIPLY', s, lstr), b.inputs['Emission Strength'])
    return m

def screen_scene_mat(name, strength=1.4, moon=True, aspect=0.62, mx=0.28, my=0.74, mr=0.07, base=0.30, bars=False):
    """screen content: nebula gradient + ridge-line mountains + moon, in UV space (no text)."""
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    N_, L, mth = nodes_helper(nt)
    out = N_('ShaderNodeOutputMaterial'); tc = N_('ShaderNodeTexCoord'); sep = N_('ShaderNodeSeparateXYZ')
    L(tc.outputs['UV'], sep.inputs[0]); U, V = sep.outputs['X'], sep.outputs['Y']
    sky = N_('ShaderNodeValToRGB'); c = sky.color_ramp
    c.elements[0].color = hexc('#2a0a3d'); c.elements[1].color = hexc('#05040c'); c.elements[1].position = 0.95
    e = c.elements.new(0.45); e.color = hexc('#3b0d4a')
    L(V, sky.inputs[0])
    # mountain profile: sum of sines
    prof = mth('ADD', mth('ADD', base, mth('MULTIPLY', mth('SINE', mth('ADD', mth('MULTIPLY', U, 9.0), 0.6)), 0.09)),
               mth('MULTIPLY', mth('SINE', mth('ADD', mth('MULTIPLY', U, 23.0), 2.0)), 0.035))
    peak = mth('MULTIPLY', mth('POWER', mth('MAXIMUM', mth('SUBTRACT', 0.18, mth('ABSOLUTE', mth('SUBTRACT', U, 0.58))), 0.0), 1.0), 1.6)
    prof = mth('ADD', prof, peak)
    below = mth('LESS_THAN', V, prof)
    rows = mth('POWER', mth('SUBTRACT', 1.0, mth('MULTIPLY', mth('ABSOLUTE', mth('SUBTRACT', mth('FRACT', mth('MULTIPLY', mth('SUBTRACT', prof, V), 40.0)), 0.5)), 2.0), clamp=True), 6.0)
    ridges = mth('MULTIPLY', mth('MULTIPLY', below, rows), mth('ADD', 0.15, mth('MULTIPLY', V, 2.2)))
    crest = mth('MULTIPLY', mth('LESS_THAN', mth('ABSOLUTE', mth('SUBTRACT', V, prof)), 0.006), 2.0)
    lines = mth('ADD', ridges, crest)
    col_ = N_('ShaderNodeMixRGB'); col_.blend_type = 'ADD'; col_.inputs[0].default_value = 1.0
    L(sky.outputs[0], col_.inputs[1])
    lc = N_('ShaderNodeCombineColor'); L(mth('MULTIPLY', lines, 0.93), lc.inputs[0]); L(mth('MULTIPLY', lines, 0.88), lc.inputs[1]); L(lines, lc.inputs[2])
    L(lc.outputs[0], col_.inputs[2]); final = col_.outputs[0]
    if moon:
        dm = mth('SQRT', mth('ADD', mth('POWER', mth('SUBTRACT', U, mx), 2.0), mth('POWER', mth('MULTIPLY', mth('SUBTRACT', V, my), aspect), 2.0)))
        disc = mth('LESS_THAN', dm, mr)
        mc = N_('ShaderNodeMixRGB'); mc.blend_type = 'MIX'; L(disc, mc.inputs[0]); L(final, mc.inputs[1]); mc.inputs[2].default_value = hexc('#f2eefc')
        final = mc.outputs[0]
    em = N_('ShaderNodeEmission'); em.inputs['Strength'].default_value = strength; L(final, em.inputs['Color'])
    gl = N_('ShaderNodeBsdfGlossy'); gl.inputs['Roughness'].default_value = 0.04; gl.inputs['Color'].default_value = (0.05, 0.05, 0.06, 1)
    add = N_('ShaderNodeAddShader'); L(em.outputs[0], add.inputs[0]); L(gl.outputs[0], add.inputs[1]); L(add.outputs[0], out.inputs[0])
    return m

# ---------------- geometry helpers ----------------
def link(o, parent=None, mat=None):
    col.objects.link(o)
    if parent: o.parent = parent
    if mat is not None and o.type == 'MESH':
        o.data.materials.clear(); o.data.materials.append(mat)
    return o

def mesh_obj(name, bm):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    return bpy.data.objects.new(name, me)

def crisp(o, angle=32):
    for p in o.data.polygons: p.use_smooth = True
    o.data.set_sharp_from_angle(angle=math.radians(angle))

def bevel(o, w, seg=4):
    b = o.modifiers.new('bev', 'BEVEL'); b.width = w; b.segments = seg; b.limit_method = 'ANGLE'
    return b

def rbox(name, sx, sy, sz, loc=(0,0,0), rot=(0,0,0), bev=0.03, seg=4, mat=None, parent=None):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=(sx, sy, sz), verts=bm.verts)
    o = mesh_obj(name, bm); o.location = loc; o.rotation_euler = rot
    link(o, parent, mat)
    if bev > 0: bevel(o, min(bev, 0.499*min(sx, sy, sz)), seg)
    crisp(o); return o

def cyl(name, r, depth, loc=(0,0,0), rot=(0,0,0), verts=96, bev=0.0, seg=3, mat=None, parent=None, r2=None):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=verts, radius1=r, radius2=r if r2 is None else r2, depth=depth)
    o = mesh_obj(name, bm); o.location = loc; o.rotation_euler = rot
    link(o, parent, mat)
    if bev > 0: bevel(o, bev, seg)
    crisp(o); return o

def torus(name, R, r, loc=(0,0,0), rot=(0,0,0), mat=None, parent=None, maj=128, mnr=32, sz=1.0):
    bm = bmesh.new(); verts = []
    for i in range(maj):
        u = TAU*i/maj; ring = []
        for j in range(mnr):
            v = TAU*j/mnr
            ring.append(bm.verts.new(((R + r*math.cos(v))*math.cos(u), (R + r*math.cos(v))*math.sin(u), sz*r*math.sin(v))))
        verts.append(ring)
    for i in range(maj):
        for j in range(mnr):
            bm.faces.new((verts[i][j], verts[(i+1) % maj][j], verts[(i+1) % maj][(j+1) % mnr], verts[i][(j+1) % mnr]))
    o = mesh_obj(name, bm); o.location = loc; o.rotation_euler = rot
    link(o, parent, mat)
    for p in o.data.polygons: p.use_smooth = True
    return o

def lathe(name, prof, segs=128, loc=(0,0,0), rot=(0,0,0), mat=None, parent=None, sharp=30):
    bm = bmesh.new(); rings = []
    for (r, z) in prof:
        if r < 1e-5: rings.append([bm.verts.new((0, 0, z))])
        else: rings.append([bm.verts.new((r*math.cos(TAU*i/segs), r*math.sin(TAU*i/segs), z)) for i in range(segs)])
    for k in range(len(rings)-1):
        A, B = rings[k], rings[k+1]
        for i in range(segs):
            if len(A) == 1 and len(B) == 1: continue
            if len(A) == 1: bm.faces.new((A[0], B[i], B[(i+1) % segs]))
            elif len(B) == 1: bm.faces.new((A[i], A[(i+1) % segs], B[0]))
            else: bm.faces.new((A[i], A[(i+1) % segs], B[(i+1) % segs], B[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = mesh_obj(name, bm); o.location = loc; o.rotation_euler = rot
    link(o, parent, mat)
    if sharp: crisp(o, sharp)
    else:
        for p in o.data.polygons: p.use_smooth = True
    return o

def sphere(name, r, loc=(0,0,0), mat=None, parent=None, seg=64):
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=seg//2, radius=r)
    o = mesh_obj(name, bm); o.location = loc; link(o, parent, mat)
    for p in o.data.polygons: p.use_smooth = True
    return o

def empty(name, loc=(0,0,0), rot=(0,0,0), parent=None):
    e = bpy.data.objects.new(name, None); e.location = loc; e.rotation_euler = rot
    return link(e, parent)

def drive(o, path, idx, expr):
    if path == 'scale': expr = f"max(0.002,{expr})"   # zero-scale instances crash Embree's BVH build
    d = (o.driver_add(path, idx) if idx is not None else o.driver_add(path)).driver
    d.type = 'SCRIPTED'; d.expression = expr; d.use_self = False

def T(k=1, phase=0.0):
    return f"({k}*2*pi*((frame-1)/{N})+{phase})"

def drive_emis(mat, expr):
    inp = mat.node_tree.nodes['Principled BSDF'].inputs['Emission Strength']
    d = inp.driver_add('default_value').driver; d.type = 'SCRIPTED'; d.expression = expr

def curve_tube(name, pts, r, mat=None, parent=None, cyclic=False, res=24, poly=False):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'
    sp = cu.splines.new('POLY' if poly else 'NURBS'); sp.points.add(len(pts)-1)
    for p, c in zip(sp.points, pts): p.co = (*c, 1)
    sp.use_cyclic_u = cyclic
    if not poly: sp.use_endpoint_u = not cyclic; sp.order_u = 4
    cu.bevel_depth = r; cu.bevel_resolution = 6; cu.resolution_u = res; cu.use_fill_caps = True
    o = bpy.data.objects.new(name, cu); link(o, parent)
    if mat: cu.materials.append(mat)
    return o

# ---------------- motif kit (lifted from the live site: moons, ringed peaks, ridge lines, sparkles) ----------------
def terrain(name, R=0.5, peaks=((0, 0, 0.35, 0.18),), res=110, seed=1, rough=0.06, parent=None, loc=(0,0,0), rot=(0,0,0),
            freq=55.0, lstr=3.2, tipc=MAG, sheen=1.0, floor=0.08):
    bm = bmesh.new(); g = {}
    hmax = 0.0
    for i in range(res+1):
        for j in range(res+1):
            x = -R + 2*R*i/res; y = -R + 2*R*j/res; rr = math.hypot(x, y)/R
            if rr > 1.02: continue
            fall = max(0.0, 1.0 - rr); fall = fall*fall*(3 - 2*fall)
            z = sum(h*math.exp(-((x-px)**2 + (y-py)**2)/(w*w)) for (px, py, h, w) in peaks)
            z += rough*(noise.fractal(Vector((x*6 + seed, y*6 - seed, seed*0.37)), 0.6, 2.1, 5) + 0.25)
            z = max(0.0, z)*fall
            hmax = max(hmax, z)
            g[(i, j)] = bm.verts.new((x, y, z))
    for i in range(res):
        for j in range(res):
            q = [(i, j), (i+1, j), (i+1, j+1), (i, j+1)]
            if all(k in g for k in q): bm.faces.new([g[k] for k in q])
    o = mesh_obj(name, bm); o.location = loc; o.rotation_euler = rot
    link(o, parent, ridge_mat(name + 'm', hmax*0.95, freq=freq/R*0.5, lstr=lstr, tipc=tipc, sheen=sheen, floor=floor))
    for p in o.data.polygons: p.use_smooth = True
    return o, hmax

def moon(name, r, loc=(0,0,0), parent=None, ring=False, ring_mat=None, tint='#ece8f6', gs=0.12):
    e = empty(name, loc=loc, parent=parent)
    s = sphere(name + 's', r, mat=moon_mat(name + 'm', tint=tint, gs=gs), parent=e, seg=64)
    drive(s, 'rotation_euler', 2, T(1))
    if ring:
        for k_, (rr_, th_) in enumerate(((1.7, 0.05), (2.05, 0.03))):
            torus(name + f'r{k_}', r*rr_, r*th_, rot=(math.radians(-6), math.radians(-18), 0), mat=ring_mat or M['g_white'], parent=e, maj=128, mnr=10, sz=0.35)
    return e

def halo(name, R, parent=None, loc=(0,0,0), rot=(0,0,0), n=3, mat=None, spinning=1):
    e = empty(name, loc=loc, rot=rot, parent=parent)
    if spinning: drive(e, 'rotation_euler', 2, T(spinning))
    for k in range(n):
        m = mat or M['g_white']
        torus(f'{name}{k}', R*(1 + 0.07*k), 0.0045*(1 - 0.2*k), mat=m, parent=e, maj=192, mnr=8)
    return e

def sparkles(name, n, rad, parent=None, zr=(-0.6, 0.6), seed=3, size=0.011, mats=('g_white', 'g_white', 'g_mag', 'g_gold')):
    rnd = random.Random(seed); e = empty(name, parent=parent)
    for k in range(n):
        a = rnd.uniform(0, TAU); rr = rad*rnd.uniform(0.65, 1.0)
        bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=2, radius=size*rnd.uniform(0.6, 1.3))
        o = mesh_obj(f'{name}{k}', bm); o.location = (rr*math.cos(a), rr*math.sin(a), rnd.uniform(*zr))
        link(o, e, M[mats[k % len(mats)]])
        ph = rnd.uniform(0, TAU); kk = rnd.choice((1, 2, 2, 3))
        for ax in range(3): drive(o, 'scale', ax, f"max(0.0,sin({T(kk, ph)}))")
    return e

def orbit(name, parent=None, k=1, phase=0.0, tilt=(0, 0, 0)):
    t = empty(name + 't', rot=tilt, parent=parent)
    o = empty(name, parent=t); drive(o, 'rotation_euler', 2, T(k, phase))
    return o

def uv_by(o, w, h, ax='xz'):
    me = o.data; me.uv_layers.new()
    for poly in me.polygons:
        for li in poly.loop_indices:
            v = me.vertices[me.loops[li].vertex_index].co
            a = v.x; b = v.z if ax == 'xz' else v.y
            me.uv_layers[0].data[li].uv = (a/w + 0.5, b/h + 0.5)

# ---------------- rig ----------------
hero = empty('hero', loc=(0, 0, 0.1)); hero.scale = (0.8, 0.8, 0.8)
root = empty('root', parent=hero)
spin = empty('spin', parent=root)
drive(spin, 'rotation_euler', 2, T(1))

# ---------------- objects ----------------
def build_laptop():
    # chunky toy-proportioned laptop, pearl shell, website "pops out" of the screen as floating glass cards + a moon
    t = empty('tilt', parent=spin)
    W, D = 1.36, 0.92
    rbox('base', W, D, 0.075, loc=(0, 0, -0.40), bev=0.035, mat=M['pearl'], parent=t)
    for ix in range(10):
        for iy in range(4):
            k = rbox(f'k{ix}{iy}', 0.1, 0.1, 0.022, loc=(-0.54 + ix*0.12, 0.07 + iy*0.115, -0.358), bev=0.02, seg=3,
                     mat=M['obsidian_m'], parent=t)
    rbox('keyglow', 1.22, 0.47, 0.004, loc=(0, 0.24, -0.364), bev=0, mat=glow('kg', MAG, 1.2), parent=t)
    rbox('pad', 0.42, 0.24, 0.006, loc=(0, -0.27, -0.362), bev=0.02, seg=3, mat=M['obsidian_m'], parent=t)
    hinge = empty('hinge', loc=(0, 0.45, -0.38), rot=(math.radians(-14), 0, 0), parent=t)
    rbox('lid', W, 0.06, 0.9, loc=(0, 0, 0.46), bev=0.035, mat=M['pearl'], parent=hinge)
    cyl('hingebar', 0.04, W*0.9, rot=(0, math.radians(90), 0), bev=0.01, mat=M['gold'], parent=hinge)
    scr = rbox('screen', W-0.12, 0.004, 0.78, loc=(0, -0.032, 0.46), bev=0, mat=screen_scene_mat('scr', 1.5), parent=hinge)
    uv_by(scr, W-0.12, 0.78)
    # floating parallax cards leaving the screen
    cards = [(-0.34, 0.66, 0.44, 0.13, 'glass_mag', 'g_mag'), (0.32, 0.44, 0.34, 0.24, 'glass_lilac', 'g_cyan'),
             (-0.28, 0.20, 0.36, 0.09, 'glass_cyan', 'g_gold')]
    for i, (x, z, w, h, gm, acc) in enumerate(cards):
        e = empty(f'card{i}', loc=(x, -0.14, z), parent=hinge)
        drive(e, 'location', 1, f"-0.16-0.09*(0.5+0.5*sin({T(1, i*2.1)}))")
        rbox(f'c{i}', w, 0.022, h, bev=0.03, seg=4, mat=M[gm], parent=e)
        rbox(f'ca{i}', w*0.5, 0.004, 0.02, loc=(-w*0.18, -0.014, h*0.18), bev=0.008, seg=2, mat=M[acc], parent=e)
    # little cursor arrow, bouncing
    cur = empty('cursor', loc=(0.48, -0.30, 0.2), parent=hinge)
    drive(cur, 'location', 2, f"0.2+0.05*sin({T(2)})")
    bm = bmesh.new()
    pts = [(0, 0), (0, -0.16), (0.04, -0.12), (0.075, -0.19), (0.095, -0.18), (0.062, -0.11), (0.11, -0.11)]
    vs = [bm.verts.new((x, 0, z)) for x, z in pts]; f = bm.faces.new(vs)
    ext = bmesh.ops.extrude_face_region(bm, geom=[f]); bmesh.ops.translate(bm, vec=(0, 0.03, 0), verts=[v for v in ext['geom'] if isinstance(v, bmesh.types.BMVert)])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    c = mesh_obj('arrow', bm); link(c, cur, M['gold']); bevel(c, 0.008, 2); crisp(c)
    ob = orbit('lmoon', parent=root, k=1, phase=0.5, tilt=(math.radians(-12), 0, 0))
    moon('m', 0.085, loc=(0.82, 0, 0.42), parent=ob)
    sparkles('sp', 9, 0.95, parent=root, zr=(-0.2, 0.7), seed=11)
    return dict(tilt_x=20, z=-0.02, scale=0.84, yaw=-0.45, rock=0.5)

def build_signet():
    # needle-spire stamp (from the site's spire) with a floating moon finial, pressing a glowing wax seal
    press = empty('press', parent=spin, loc=(0, 0, 0.0))
    drive(press, 'location', 2, f"0.03+0.30*pow(abs(cos({T(0.5)})),0.8)")
    lathe('bell', [(0, -0.36), (0.30, -0.36), (0.315, -0.345), (0.315, -0.30), (0.25, -0.27), (0.14, -0.20), (0.095, -0.12), (0.09, -0.06), (0, -0.06)],
          mat=M['gold'], parent=press, sharp=40)
    torus('collar', 0.10, 0.018, loc=(0, 0, -0.06), mat=M['gold_b'], parent=press, maj=96, mnr=16)
    lathe('spire', [(0, -0.07), (0.085, -0.07), (0.075, 0.05), (0.06, 0.25), (0.04, 0.45), (0.02, 0.62), (0.0, 0.74)], segs=6,
          mat=M['glass_lilac'], parent=press, sharp=20)
    lathe('spirecore', [(0, -0.05), (0.03, -0.05), (0.02, 0.35), (0, 0.55)], segs=6, mat=M['g_mag'], parent=press, sharp=20)
    torus('band', 0.07, 0.01, loc=(0, 0, 0.05), mat=M['gold'], parent=press, maj=64, mnr=10)
    fl = empty('float', loc=(0, 0, 0.82), parent=press)
    drive(fl, 'location', 2, f"0.82+0.035*sin({T(2)})")
    moon('fm', 0.085, parent=fl, ring=True, ring_mat=M['gold'])
    # seal emblem on the stamp face: ringed peak (mirrored, reads in the wax)
    seal = empty('seal', loc=(0, 0, -0.52), parent=spin)
    lathe('wax', [(0, -0.06), (0.40, -0.06), (0.47, -0.04), (0.50, -0.005), (0.47, 0.03), (0.41, 0.045), (0, 0.045)], segs=96, mat=M['wax'], parent=seal, sharp=0)
    for k in range(7):  # drips / blobs around the rim
        a = k*TAU/7 + 0.4
        o = sphere(f'blob{k}', 0.06 + 0.02*(k % 3), loc=(0.47*math.cos(a), 0.47*math.sin(a), -0.03), mat=M['wax'], parent=seal, seg=24)
        o.scale = (1.3, 1.0, 0.45)
    lathe('peak', [(0, 0.04), (0.2, 0.04), (0.12, 0.08), (0.05, 0.15), (0, 0.17)], segs=64, mat=M['wax'], parent=seal, sharp=0)
    torus('pring', 0.25, 0.013, loc=(0, 0, 0.075), rot=(math.radians(14), 0, 0), mat=M['wax'], parent=seal, maj=96, mnr=10)
    torus('erim', 0.36, 0.012, loc=(0, 0, 0.045), mat=M['wax'], parent=seal, maj=96, mnr=10)
    P = f"fmod((frame-1)/{N}+0.5,1.0)"   # 0 at impact (mid loop), rising to 1
    gl = glow('sealglow', MAG, 0.0); drive_emis(gl, f"7.0*pow(max(0.0,1.0-{P}*2.2),2)")
    torus('glowring', 0.44, 0.012, loc=(0, 0, 0.02), mat=gl, parent=seal, maj=128, mnr=10)
    drive_emis(M['wax'], f"0.25+2.2*pow(max(0.0,1.0-{P}*2.5),2)")
    burst = empty('burst', loc=(0, 0, -0.47), parent=spin)
    for k in range(12):
        a = k*TAU/12
        o = sphere(f'sb{k}', 0.016, mat=M['g_gold' if k % 2 else 'g_mag'], parent=burst, seg=12)
        r_ = f"(0.42+0.55*{P})"
        drive(o, 'location', 0, f"{math.cos(a):.4f}*{r_}"); drive(o, 'location', 1, f"{math.sin(a):.4f}*{r_}")
        drive(o, 'location', 2, f"0.25*{P}*(1.2-{P})")
        for ax in range(3): drive(o, 'scale', ax, f"max(0.0,1.0-{P}*2.6)")
    sparkles('sp', 7, 0.8, parent=root, zr=(-0.1, 0.8), seed=5)
    return dict(tilt_x=24, z=-0.13, scale=0.88)

def film_scene_mat():
    """film strip: each frame holds a tiny ridge-line mountain + moon in a different site hue."""
    m = bpy.data.materials.new('film'); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    N_, L, mth = nodes_helper(nt)
    out = N_('ShaderNodeOutputMaterial'); tc = N_('ShaderNodeTexCoord'); sep = N_('ShaderNodeSeparateXYZ'); L(tc.outputs['UV'], sep.inputs[0])
    U, V = sep.outputs['X'], sep.outputs['Y']
    dv = mth('ABSOLUTE', mth('SUBTRACT', V, 0.5))
    fu = mth('FRACT', mth('MULTIPLY', U, 84))
    hole = mth('MULTIPLY', mth('MULTIPLY', mth('GREATER_THAN', dv, 0.36), mth('LESS_THAN', dv, 0.44)),
               mth('MULTIPLY', mth('GREATER_THAN', fu, 0.28), mth('LESS_THAN', fu, 0.72)))
    NF = 18
    ff = mth('FRACT', mth('MULTIPLY', U, NF))
    win = mth('MULTIPLY', mth('LESS_THAN', dv, 0.30), mth('MULTIPLY', mth('GREATER_THAN', ff, 0.06), mth('LESS_THAN', ff, 0.94)))
    lv = mth('ADD', mth('MULTIPLY', mth('SUBTRACT', V, 0.2), 1/0.6), 0.0)  # 0..1 inside window
    lu = ff
    idx = mth('FLOOR', mth('MULTIPLY', U, NF))
    prof = mth('ADD', mth('ADD', 0.28, mth('MULTIPLY', mth('SINE', mth('ADD', mth('MULTIPLY', lu, 7.0), idx)), 0.08)),
               mth('MULTIPLY', mth('MAXIMUM', mth('SUBTRACT', 0.22, mth('ABSOLUTE', mth('SUBTRACT', lu, mth('ADD', 0.35, mth('MULTIPLY', mth('FRACT', mth('MULTIPLY', idx, 0.618)), 0.3))))), 0.0), 2.2))
    below = mth('LESS_THAN', lv, prof)
    rows = mth('POWER', mth('SUBTRACT', 1.0, mth('MULTIPLY', mth('ABSOLUTE', mth('SUBTRACT', mth('FRACT', mth('MULTIPLY', mth('SUBTRACT', prof, lv), 22.0)), 0.5)), 2.0), clamp=True), 5.0)
    mnt = mth('ADD', mth('MULTIPLY', below, rows), mth('MULTIPLY', mth('LESS_THAN', mth('ABSOLUTE', mth('SUBTRACT', lv, prof)), 0.02), 1.5))
    md = mth('SQRT', mth('ADD', mth('POWER', mth('SUBTRACT', lu, 0.72), 2.0), mth('POWER', mth('MULTIPLY', mth('SUBTRACT', lv, 0.72), 0.75), 2.0)))
    mo = mth('LESS_THAN', md, 0.085)
    hue = N_('ShaderNodeValToRGB'); cr = hue.color_ramp; cr.interpolation = 'CONSTANT'
    cols = [MAG, '#a43cff', CYAN, GOLD, RED]
    cr.elements[0].color = hexc(cols[0]); cr.elements[1].position = 0.2; cr.elements[1].color = hexc(cols[1])
    for i_, c in enumerate(cols[2:]): e = cr.elements.new(0.4 + 0.2*i_); e.color = hexc(c)
    L(mth('FRACT', mth('MULTIPLY', idx, 0.2)), hue.inputs[0])
    skyv = mth('MULTIPLY', mth('SUBTRACT', 1.0, lv, clamp=True), 0.35)
    sky = N_('ShaderNodeMixRGB'); sky.blend_type = 'MULTIPLY'; sky.inputs[0].default_value = 1.0
    L(hue.outputs[0], sky.inputs[1]); skc = N_('ShaderNodeCombineColor'); [L(skyv, skc.inputs[q]) for q in range(3)]; L(skc.outputs[0], sky.inputs[2])
    white = mth('ADD', mnt, mo)
    wc = N_('ShaderNodeCombineColor'); L(white, wc.inputs[0]); L(mth('MULTIPLY', white, 0.92), wc.inputs[1]); L(white, wc.inputs[2])
    add = N_('ShaderNodeMixRGB'); add.blend_type = 'ADD'; add.inputs[0].default_value = 1.0; L(sky.outputs[0], add.inputs[1]); L(wc.outputs[0], add.inputs[2])
    body = N_('ShaderNodeBsdfPrincipled'); body.inputs['Base Color'].default_value = hexc('#0a0910')
    body.inputs['Roughness'].default_value = 0.1; body.inputs['Coat Weight'].default_value = 1.0; body.inputs['Thin Film Thickness'].default_value = 300
    frm = N_('ShaderNodeBsdfPrincipled'); frm.inputs['Base Color'].default_value = (0.02, 0.02, 0.02, 1)
    frm.inputs['Roughness'].default_value = 0.05; frm.inputs['Transmission Weight'].default_value = 0.5
    L(add.outputs[0], frm.inputs['Emission Color']); frm.inputs['Emission Strength'].default_value = 2.2
    edge = N_('ShaderNodeBsdfPrincipled'); edge.inputs['Base Color'].default_value = hexc('#f4c766')
    edge.inputs['Metallic'].default_value = 1.0; edge.inputs['Roughness'].default_value = 0.18; edge.inputs['Thin Film Thickness'].default_value = 450
    m1 = N_('ShaderNodeMixShader'); L(win, m1.inputs[0]); L(body.outputs[0], m1.inputs[1]); L(frm.outputs[0], m1.inputs[2])
    m2 = N_('ShaderNodeMixShader'); L(mth('GREATER_THAN', dv, 0.465), m2.inputs[0]); L(m1.outputs[0], m2.inputs[1]); L(edge.outputs[0], m2.inputs[2])
    tr = N_('ShaderNodeBsdfTransparent')
    m3 = N_('ShaderNodeMixShader'); L(hole, m3.inputs[0]); L(m2.outputs[0], m3.inputs[1]); L(tr.outputs[0], m3.inputs[2])
    L(m3.outputs[0], out.inputs[0])
    return m

def mobius_mesh(name, R=0.74, w=0.31, n=540, m=12):
    bm = bmesh.new(); uv = bm.loops.layers.uv.new(); grid = []
    for i in range(n):
        u = TAU*i/n; row = []
        for j in range(m+1):
            v = -w + 2*w*j/m
            row.append(bm.verts.new(((R + v*math.cos(u/2))*math.cos(u), (R + v*math.cos(u/2))*math.sin(u), v*math.sin(u/2))))
        grid.append(row)
    for i in range(n):
        i2 = (i+1) % n
        for j in range(m):
            if i2 == 0: a, b, c, d = grid[i][j], grid[0][m-j], grid[0][m-j-1], grid[i][j+1]
            else: a, b, c, d = grid[i][j], grid[i2][j], grid[i2][j+1], grid[i][j+1]
            f = bm.faces.new((a, b, c, d)); us = (i/n, (i+1)/n)
            for lp, (uu, vv) in zip(f.loops, [(us[0], j/m), (us[1], j/m), (us[1], (j+1)/m), (us[0], (j+1)/m)]): lp[uv].uv = (uu, vv)
    return mesh_obj(name, bm)

def build_mobius():
    o = mobius_mesh('mobius'); link(o, spin, film_scene_mat())
    for p in o.data.polygons: p.use_smooth = True
    s = o.modifiers.new('sol', 'SOLIDIFY'); s.thickness = 0.014; s.offset = 0
    # a little moon threads through the loop, a play-head star rides along the strip
    mc = empty('mc', loc=(-0.25, -0.1, 0.86), parent=root); drive(mc, 'location', 2, f"0.86+0.04*sin({T(2)})")
    moon('m', 0.1, parent=mc, ring=True, ring_mat=M['gold'])
    ph = empty('ph', parent=spin); drive(ph, 'rotation_euler', 2, T(-2))
    sphere('phs', 0.03, loc=(0.74, 0, 0.0), mat=M['g_white'], parent=ph, seg=16)
    sparkles('sp', 10, 0.95, parent=root, zr=(-0.5, 0.5), seed=9)
    return dict(tilt_x=30, z=-0.04, scale=0.82, yaw=0.7)

def build_gyro():
    # iridescent gyroscope; core is a ringed moon, glowing beads race along each ring
    outer = empty('outer', parent=spin)
    torus('r1', 0.9, 0.05, mat=M['glass'], parent=outer, maj=192, mnr=40)
    torus('r1g', 0.9, 0.014, mat=M['gold'], parent=outer, maj=192, mnr=16)
    mid = empty('mid', parent=outer); drive(mid, 'rotation_euler', 0, T(1, 0.6))
    torus('r2', 0.7, 0.045, rot=(0, math.radians(90), 0), mat=M['glass_mag'], parent=mid, maj=192, mnr=40)
    torus('r2g', 0.7, 0.012, rot=(0, math.radians(90), 0), mat=M['pearl'], parent=mid, maj=192, mnr=16)
    inn = empty('inn', parent=mid); drive(inn, 'rotation_euler', 1, T(2, 1.1))
    torus('r3', 0.5, 0.042, rot=(math.radians(90), 0, 0), mat=M['glass_cyan'], parent=inn, maj=160, mnr=40)
    torus('r3g', 0.5, 0.011, rot=(math.radians(90), 0, 0), mat=M['gold'], parent=inn, maj=160, mnr=16)
    core = empty('core', parent=inn); drive(core, 'rotation_euler', 2, T(-1))
    moon('cm', 0.2, parent=core, ring=True, ring_mat=M['g_mag'])
    for nm, R, par, rot, mk, k in (('b1', 0.9, outer, (0, 0, 0), 'g_white', 2), ('b2', 0.7, mid, (0, math.radians(90), 0), 'g_mag', -3),
                                   ('b3', 0.5, inn, (math.radians(90), 0, 0), 'g_cyan', 3)):
        e = empty(nm + 'e', rot=rot, parent=par); r_ = empty(nm + 'r', parent=e); drive(r_, 'rotation_euler', 2, T(k))
        sphere(nm, 0.038, loc=(R, 0, 0), mat=M[mk], parent=r_, seg=24)
        sphere(nm + 'x', 0.026, loc=(-R, 0, 0), mat=M['g_gold'], parent=r_, seg=24)
    lathe('pin', [(0, -1.0), (0.014, -0.98), (0.014, 0.98), (0, 1.0)], segs=24, mat=M['gold'], parent=outer)
    sphere('pt', 0.035, loc=(0, 0, 1.0), mat=M['pearl'], parent=outer, seg=24)
    sphere('pb', 0.035, loc=(0, 0, -1.0), mat=M['pearl'], parent=outer, seg=24)
    sparkles('sp', 9, 1.0, parent=root, zr=(-0.6, 0.6), seed=21)
    return dict(tilt_x=18, z=0.0, scale=0.86, yaw=0.4)

def build_target():
    # exploded glass target: rings float apart and breathe, dart in the bullseye, ripple pulses out on each hit
    t = empty('t', rot=(math.radians(90), 0, 0), parent=spin)
    rings = [(0.80, 'glass', 0.05), (0.63, 'glass_mag', 0.055), (0.46, 'glass_lilac', 0.06), (0.29, 'glass_mag', 0.065)]
    for i, (r, mk, d) in enumerate(rings):
        e = empty(f're{i}', parent=t)
        drive(e, 'location', 2, f"{0.05*i:.3f}+{0.035*i:.3f}*sin({T(1, 0.0)})")
        lathe(f'ring{i}', [(r - 0.15, -d/2), (r, -d/2), (r + 0.012, 0), (r, d/2), (r - 0.15, d/2), (r - 0.162, 0), (r - 0.15, -d/2)],
              segs=160, mat=M[mk], parent=e, sharp=40)
        torus(f'gr{i}', r + 0.006, 0.007, mat=M['gold'], parent=e, maj=160, mnr=10)
    be = empty('bull', parent=t); drive(be, 'location', 2, f"0.2+0.06*sin({T(1)})")
    cyl('bullseye', 0.14, 0.09, verts=96, bev=0.03, seg=4, mat=principled('bullred', '#c8102e', rough=0.15, coat=1.0, emis=RED, estr=1.2), parent=be)
    dart = empty('dart', loc=(0, 0, 0.04), rot=(math.radians(-18), math.radians(14), 0), parent=be)
    lathe('tip', [(0, -0.02), (0.016, 0.06), (0.016, 0.1), (0, 0.1)], segs=24, mat=M['pearl'], parent=dart)
    lathe('shaft', [(0, 0.1), (0.028, 0.12), (0.034, 0.3), (0.022, 0.52), (0.014, 0.66), (0, 0.67)], segs=48, mat=M['gold'], parent=dart, sharp=0)
    for k in range(3):
        a = k*TAU/3
        bm = bmesh.new(); vs = [bm.verts.new(v) for v in ((0, 0, 0.44), (0, 0.12, 0.54), (0, 0.13, 0.7), (0, 0.0, 0.64))]
        bm.faces.new(vs); o = mesh_obj(f'fl{k}', bm); link(o, dart, M['g_mag'] if k else M['glass_mag'])
        o.rotation_euler = (0, 0, a); s = o.modifiers.new('s', 'SOLIDIFY'); s.thickness = 0.008
    P = f"fmod((frame-1)/{N}*2,1.0)"
    for j in range(2):
        rp = glow(f'rip{j}', MAG if j else LILAC, 0.0); drive_emis(rp, f"5.0*pow(max(0.0,1.0-fmod((frame-1)/{N}*2+{0.5*j},1.0)),2)")
        ro = torus(f'ripple{j}', 0.2, 0.006, mat=rp, parent=t, maj=160, mnr=8)
        for ax in (0, 1): drive(ro, 'scale', ax, f"1.0+4.4*fmod((frame-1)/{N}*2+{0.5*j},1.0)")
    ob = orbit('tm', parent=root, k=1, phase=1.0, tilt=(math.radians(70), 0, 0))
    moon('m', 0.075, loc=(0.95, 0, 0), parent=ob)
    sparkles('sp', 8, 0.95, parent=root, zr=(-0.6, 0.6), seed=31)
    return dict(tilt_x=10, z=0.0, scale=0.92, yaw=0.5, rock=0.42)

def build_bag():
    # tall velvet shopping bag with gussets and rope handles; a ringed little planet pops out like the product; a glass tag dangles
    b = empty('b', parent=spin)
    W, D, H = 0.72, 0.38, 1.04
    rbox('bag', W, D, H, loc=(0, 0, -0.34), bev=0.05, seg=5, mat=M['velvet'], parent=b)
    rbox('cuff', W + 0.012, D + 0.012, 0.1, loc=(0, 0, 0.13), bev=0.03, seg=4, mat=M['pearl'], parent=b)
    rbox('mouth', W - 0.06, D - 0.06, 0.02, loc=(0, 0, 0.18), bev=0.0, mat=glow('bagglow', MAG, 3.0), parent=b)
    for sx in (-1, 1):  # gusset creases
        for sz in (0, 1):
            rbox(f'crease{sx}{sz}', 0.006, 0.006, 0.5, loc=(sx*(W/2 + 0.002), 0, -0.48 + 0.42*sz), rot=(math.radians(26*(1 if sz else -1)), 0, 0), bev=0, mat=M['gold_b'], parent=b)
    for s in (-1, 1):
        pts = [(-0.16, s*0.13, 0.17), (-0.2, s*0.13, 0.38), (-0.08, s*0.13, 0.54), (0.08, s*0.13, 0.54), (0.2, s*0.13, 0.38), (0.16, s*0.13, 0.17)]
        curve_tube(f'handle{s}', pts, 0.017, mat=M['gold'], parent=b)
    # front emblem: ringed peak in gold, a tiny neon moon
    em = empty('emb', loc=(0, -D/2 - 0.03, -0.32), parent=b)
    sphere('embp', 0.075, mat=M['gold'], parent=em, seg=32)
    torus('embring', 0.135, 0.009, rot=(math.radians(90) - 0.35, 0.3, 0), mat=M['g_mag'], parent=em, maj=96, mnr=8)
    sphere('embmoon', 0.025, loc=(0.16, -0.005, 0.12), mat=M['g_white'], parent=em, seg=16)
    for k, (ang, mk) in enumerate(((-0.5, 'tissue'), (0.05, 'pearl_s'), (0.55, 'tissue'))):  # tissue fans
        tp = empty(f'tis{k}', loc=(-0.18 + 0.18*k, 0.0, 0.17), rot=(0.12*(k - 1), ang, 0), parent=b)
        drive(tp, 'rotation_euler', 1, f"{ang}+0.06*sin({T(2, k)})")
        bm = bmesh.new(); vs = [bm.verts.new(v) for v in ((-0.07, 0, 0), (0.07, 0, 0), (0.1, 0, 0.2), (0.0, 0, 0.25), (-0.1, 0, 0.2))]
        bm.faces.new(vs); o = mesh_obj(f'tisq{k}', bm); link(o, tp, M[mk]); s_ = o.modifiers.new('s', 'SOLIDIFY'); s_.thickness = 0.008
    pl = empty('planet', loc=(0, 0, 0.82), parent=b)
    drive(pl, 'location', 2, f"0.82+0.06*sin({T(2)})")
    moon('pm', 0.14, parent=pl, ring=True, ring_mat=M['gold'], tint='#f2d9ff', gs=0.2)
    tag = empty('tag', loc=(W/2 - 0.04, -D/2 + 0.02, 0.17), parent=b); drive(tag, 'rotation_euler', 1, f"0.25*sin({T(2)})")
    cyl('string', 0.004, 0.16, loc=(0, 0, -0.08), verts=8, mat=M['gold'], parent=tag)
    rbox('tagc', 0.15, 0.014, 0.1, loc=(0, -0.01, -0.21), bev=0.025, seg=3, mat=M['glass_mag'], parent=tag)
    sparkles('sp', 9, 0.85, parent=root, zr=(-0.4, 0.8), seed=41)
    return dict(tilt_x=14, z=-0.1, scale=0.86, yaw=0.55, rock=0.5)

def build_chain():
    # three glass terrariums, each holding a tiny ridge-line mountain world, joined by real gold chain links
    c = empty('c', parent=spin)
    pos = [(0.0, 0.0, 0.42), (-0.5, 0.25, -0.32), (0.5, -0.25, -0.32)]
    for i, p in enumerate(pos):
        e = empty(f'blk{i}', loc=p, parent=c)
        drive(e, 'location', 2, f"{p[2]}+0.04*sin({T(1, i*2.1)})")
        drive(e, 'rotation_euler', 2, f"0.35*sin({T(1, i)})")
        rbox(f'glass{i}', 0.46, 0.46, 0.46, bev=0.06, seg=5, mat=M['glass'], parent=e)
        rbox(f'floor{i}', 0.4, 0.4, 0.02, loc=(0, 0, -0.2), bev=0.008, seg=2, mat=M['obsidian'], parent=e)
        terrain(f'ter{i}', R=0.19, peaks=((0.02*i, 0, 0.17 + 0.03*i, 0.07), (-0.08, 0.06, 0.08, 0.06), (0.08, -0.05, 0.06, 0.05)), res=70,
                seed=i*3 + 1, rough=0.02, parent=e, loc=(0, 0, -0.19), freq=60, lstr=3.6)
        if i == 0: moon(f'cm{i}', 0.04, loc=(-0.09, 0.0, 0.11), parent=e)
        else: halo(f'ch{i}', 0.11, parent=e, loc=(0.02*i, 0, -0.06), rot=(0.25, 0, 0), n=1)
        for corner in ((1, 1), (-1, -1)):
            sphere(f'gem{i}{corner}', 0.022, loc=(0.23*corner[0], 0.23*corner[1], 0.23), mat=M['g_gold'], parent=e, seg=16)
    for a, b_ in ((0, 1), (1, 2), (2, 0)):
        A, B = Vector(pos[a]), Vector(pos[b_]); d = B - A; L_ = d.length
        q = d.to_track_quat('Z', 'Y')
        n = 4
        for k in range(n):
            tt = 0.3 + 0.4*k/(n-1)
            lk = torus(f'lk{a}{b_}{k}', 0.05, 0.012, loc=A + d*tt, mat=M['gold'], parent=c, maj=48, mnr=12)
            lk.scale = (0.7, 1.0, 1.0)
            e_ = q.to_euler(); lk.rotation_euler = (q @ Matrix.Rotation(math.radians(90), 4, 'Y').to_quaternion() @ Matrix.Rotation((k % 2)*math.pi/2, 4, 'Z').to_quaternion()).to_euler()
    sparkles('sp', 8, 0.95, parent=root, zr=(-0.6, 0.7), seed=51)
    return dict(tilt_x=14, z=0.03, scale=1.0, yaw=0.3)

def rr_pts(w, h, r, n=8):
    pts = []
    for cx, cz, a0 in ((w/2-r, h/2-r, 0), (-w/2+r, h/2-r, 90), (-w/2+r, -h/2+r, 180), (w/2-r, -h/2+r, 270)):
        for k in range(n+1):
            a = math.radians(a0 + 90*k/n); pts.append((cx + r*math.cos(a), cz + r*math.sin(a)))
    return pts

def build_sign():
    # swinging blade sign with neon line-art of the site's ringed peak and moon; a tiny moon lantern hangs off the arm
    s = empty('s', parent=spin)
    rbox('arm', 1.16, 0.045, 0.045, loc=(0, 0, 0.62), bev=0.015, mat=M['gold'], parent=s)
    sphere('cap', 0.05, loc=(0.6, 0, 0.62), mat=M['gold'], parent=s, seg=24)
    curve_tube('scroll', [(-0.58, 0, 0.62), (-0.5, 0, 0.4), (-0.32, 0, 0.42), (-0.3, 0, 0.53), (-0.4, 0, 0.55), (-0.38, 0, 0.47)], 0.013, mat=M['gold'], parent=s)
    cyl('post', 0.04, 0.3, loc=(-0.6, 0, 0.62), rot=(0, math.radians(90), 0), mat=M['gold_b'], parent=s, verts=32, r2=0.03)
    sw = empty('swing', loc=(0.02, 0, 0.6), parent=s); drive(sw, 'rotation_euler', 0, f"0.12*sin({T(2)})")
    for x in (-0.3, 0.3):
        for k in range(3):
            torus(f'cl{x}{k}', 0.022, 0.006, loc=(x, 0, -0.035 - 0.04*k), rot=(math.radians(90), 0, (k % 2)*math.pi/2), mat=M['gold'], parent=sw, maj=24, mnr=8)
    pn = empty('pn', loc=(0, 0, -0.5), parent=sw)
    rbox('panel', 0.86, 0.075, 0.74, bev=0.09, seg=7, mat=M['obsidian'], parent=pn)
    rbox('edge', 0.875, 0.05, 0.755, bev=0.09, seg=7, mat=M['pearl'], parent=pn)
    for side in (-1, 1):
        y = side*0.042
        def neon(nm, pts2, mk, cyc=False, r=0.009):
            curve_tube(nm, [(x, y, z) for x, z in pts2], r, mat=M[mk], parent=pn, cyclic=cyc, poly=True)
        neon(f'border{side}', rr_pts(0.7, 0.58, 0.08), 'g_pur' if side < 0 else 'g_mag', cyc=True)
        crest = [(-0.28, -0.17), (-0.19, -0.07), (-0.13, -0.11), (-0.04, 0.07), (0.02, 0.02), (0.08, 0.12), (0.15, -0.01), (0.2, 0.03), (0.28, -0.17)]
        neon(f'peak{side}', crest, 'g_white', r=0.008)
        for k, f_ in enumerate((0.7, 0.42, 0.16)):
            pts2 = [(x*(0.55 + 0.45*f_), -0.17 + (z + 0.17)*f_) for x, z in crest[1:-1]]
            neon(f'ridge{side}{k}', pts2, 'g_pur' if k else 'g_mag', r=0.0045)
        ring = [(0.08 + 0.15*math.cos(a), 0.1 + 0.03*math.sin(a)) for a in [TAU*q/48 for q in range(48)]]
        neon(f'ring{side}', ring, 'g_gold', cyc=True, r=0.006)
        sphere(f'nm{side}', 0.045, loc=(-0.19, side*0.045, 0.16), mat=M['g_white'], parent=pn, seg=20).scale = (1, 0.3, 1)
    lan = empty('lan', loc=(0.56, 0, 0.6), parent=s); drive(lan, 'rotation_euler', 0, f"0.18*sin({T(2, 0.8)})")
    cyl('lstr', 0.004, 0.2, loc=(0, 0, -0.1), verts=8, mat=M['gold'], parent=lan)
    moon('lm', 0.06, loc=(0, 0, -0.26), parent=lan, gs=0.6)
    sparkles('sp', 8, 0.9, parent=root, zr=(-0.6, 0.6), seed=61)
    return dict(tilt_x=8, z=0.04, scale=0.98, yaw=0.3, rock=0.7)

def build_box():
    # gift box: the lid floats up on light, and a ringed peak world rises out of the glow
    b = empty('b', parent=spin)
    S, Hh, th = 0.86, 0.56, 0.04
    rbox('floor', S, S, th, loc=(0, 0, -0.66 + th/2), bev=0.015, mat=M['obsidian'], parent=b)
    for k in range(4):
        a = k*math.pi/2; cx, cy = math.cos(a)*(S/2 - th/2), math.sin(a)*(S/2 - th/2)
        rbox(f'wall{k}', th if k % 2 == 0 else S, S if k % 2 == 0 else th, Hh, loc=(cx, cy, -0.38), bev=0.015, mat=M['obsidian'], parent=b)
    for rot in (0, math.pi/2):
        for sgn in (-1, 1):
            o = rbox(f'ribb{rot}{sgn}', 0.012, 0.1, Hh + 0.01, loc=(sgn*(S/2 + 0.004), 0, -0.38), rot=(0, 0, rot), bev=0.004, seg=1, mat=M['pearl'], parent=b)
            if rot: o.location = (0, sgn*(S/2 + 0.004), -0.38)
    rbox('inner', S - 2*th - 0.01, S - 2*th - 0.01, 0.01, loc=(0, 0, -0.62), bev=0, mat=glow('boxglow', MAG, 5.0), parent=b)
    area_in = bpy.data.lights.new('inlight', 'POINT'); area_in.color = hexc(MAG)[:3]; area_in.energy = 60; area_in.shadow_soft_size = 0.2
    li = bpy.data.objects.new('inlight', area_in); li.location = (0, 0, -0.3); link(li, b)
    lid = empty('lid', parent=b); drive(lid, 'location', 2, f"0.4+0.06*sin({T(1)})")
    drive(lid, 'rotation_euler', 0, f"0.1*sin({T(1, 0.7)})"); drive(lid, 'rotation_euler', 1, f"0.08*sin({T(1, 2.0)})")
    rbox('lidb', 0.92, 0.92, 0.14, bev=0.04, seg=5, mat=M['obsidian'], parent=lid)
    for rot in (0, math.pi/2):
        rbox(f'rib{rot}', 0.935, 0.1, 0.152, rot=(0, 0, rot), bev=0.01, seg=2, mat=M['pearl'], parent=lid)
    for s in (-1, 1):
        o = torus(f'loop{s}', 0.13, 0.034, loc=(s*0.12, 0, 0.15), rot=(math.radians(90), math.radians(s*28), 0), mat=M['pearl'], parent=lid, maj=64, mnr=16)
        o.scale = (1.0, 0.6, 1.0)
        tl = rbox(f'tail{s}', 0.06, 0.012, 0.2, loc=(s*0.08, -0.05, 0.02), rot=(math.radians(-30), math.radians(s*35), 0), bev=0.005, seg=2, mat=M['pearl'], parent=lid)
    sphere('knot', 0.06, loc=(0, 0, 0.12), mat=M['pearl'], parent=lid, seg=32).scale = (1.2, 1, 0.8)
    lathe('beam', [(0.36, -0.1), (0.44, 0.22), (0.0, 0.22)], segs=64, mat=principled('beam', '#000000', emis=MAG, estr=0.0, trans=0.0), parent=b, sharp=0, loc=(0, 0, 0)).hide_render = True
    wd = empty('world', parent=b); drive(wd, 'location', 2, f"0.0+0.03*sin({T(2)})"); drive(wd, 'rotation_euler', 2, T(-1))
    terrain('ter', R=0.36, peaks=((0, 0, 0.42, 0.1), (0.13, 0.07, 0.16, 0.07), (-0.12, -0.08, 0.12, 0.07)), res=90, seed=7, rough=0.03,
            parent=wd, loc=(0, 0, -0.3), freq=60, lstr=6.0)
    halo('bh', 0.2, parent=wd, loc=(0, 0, 0.0), rot=(0.3, 0.1, 0), n=2)
    moon('bm', 0.05, loc=(-0.2, 0.05, 0.2), parent=wd, gs=0.4)
    sparkles('sp', 12, 0.55, parent=b, zr=(-0.05, 0.75), seed=71)
    return dict(tilt_x=26, z=0.16, scale=0.92, yaw=0.6)

def build_lens():
    # crisp cinema lens: hard-edged stepped barrel, knurled gold focus ring, gold scale ticks,
    # thin-film coated front glass with visible aperture blades, and a little moon it is focused on
    t = empty('t', rot=(math.radians(90), 0, 0), parent=spin)
    prof = [(0, -0.62), (0.26, -0.62), (0.28, -0.60), (0.28, -0.50), (0.32, -0.50), (0.32, -0.30), (0.355, -0.30), (0.355, 0.08),
            (0.39, 0.08), (0.39, 0.30), (0.43, 0.32), (0.45, 0.46), (0.45, 0.55), (0.41, 0.55), (0.39, 0.50), (0.0, 0.50)]
    lathe('barrel', prof, mat=M['obsidian'], parent=t, sharp=20)
    cyl('focus', 0.37, 0.22, loc=(0, 0, -0.08), verts=128, mat=M['gold'], parent=t)
    for k in range(64):
        a = k*TAU/64
        rbox(f'kn{k}', 0.022, 0.018, 0.2, loc=(0.375*math.cos(a), 0.375*math.sin(a), -0.08), rot=(0, 0, a), bev=0.004, seg=1, mat=M['gold_b'], parent=t)
    for k in range(18):  # distance scale ticks
        a = k*TAU/36 - 0.9
        rbox(f'tk{k}', 0.006, 0.004, 0.05 if k % 3 else 0.08, loc=(0.358*math.cos(a), 0.358*math.sin(a), 0.16), rot=(0, 0, a + math.pi/2), bev=0, mat=M['g_white'], parent=t)
    torus('pinkring', 0.392, 0.008, loc=(0, 0, 0.30), mat=M['g_mag'], parent=t, maj=160, mnr=10)
    torus('goldlip', 0.45, 0.012, loc=(0, 0, 0.55), mat=M['gold'], parent=t, maj=160, mnr=12)
    cyl('mount', 0.27, 0.06, loc=(0, 0, -0.65), verts=96, mat=M['pearl'], parent=t)
    lathe('front', [(0, 0.47), (0.395, 0.47), (0.395, 0.50), (0.3, 0.545), (0.0, 0.56)], segs=128, mat=principled('coat', '#ffffff', rough=0.0, trans=1.0, ior=1.6, film=520, film_ior=1.38), parent=t, sharp=0)
    ap = empty('ap', loc=(0, 0, 0.40), parent=t); drive(ap, 'rotation_euler', 2, f"0.35*sin({T(1)})")
    for k in range(7):
        a = k*TAU/7
        rbox(f'blade{k}', 0.3, 0.14, 0.006, loc=(0.2*math.cos(a), 0.2*math.sin(a), 0.004*k), rot=(0, 0, a + 1.1), bev=0.004, seg=1, mat=M['obsidian_m'], parent=ap)
    sphere('apglow', 0.06, loc=(0, 0, 0.36), mat=M['g_mag'], parent=t, seg=24).scale = (1, 1, 0.3)
    ob = orbit('lm', parent=root, k=1, phase=2.0, tilt=(math.radians(-20), 0, 0))
    moon('m', 0.085, loc=(0.85, 0, 0.0), parent=ob, ring=True, ring_mat=M['gold'])
    sparkles('sp', 8, 0.95, parent=root, zr=(-0.6, 0.6), seed=81)
    return dict(tilt_x=14, z=0.0, scale=1.05, yaw=0.8, rock=0.45)

def build_phone():
    p = empty('p', parent=spin)
    rbox('phone', 0.74, 0.08, 1.46, bev=0.13, seg=8, mat=M['pearl'], parent=p)
    scr = rbox('screen', 0.66, 0.004, 1.38, loc=(0, -0.042, 0), bev=0.0, mat=screen_scene_mat('pscr', 1.5, aspect=2.1, mx=0.62, my=0.72, mr=0.11, base=0.22), parent=p)
    uv_by(scr, 0.66, 1.38)
    for i_, (zz, ww, mk) in enumerate(((0.42, 0.34, 'g_mag'), (0.35, 0.22, 'g_pur'))):
        rbox(f'pill{i_}', ww, 0.004, 0.035, loc=(-0.3 + ww/2 + 0.05, -0.045, zz), bev=0.017, seg=3, mat=M[mk], parent=p)
    rbox('island', 0.18, 0.004, 0.05, loc=(0, -0.046, 0.6), bev=0.024, seg=4, mat=M['obsidian_m'], parent=p)
    for z in (0.25, 0.1):
        rbox(f'btn{z}', 0.012, 0.03, 0.1, loc=(0.375, 0, z), bev=0.006, seg=2, mat=M['gold'], parent=p)
    halo('ph', 0.66, parent=root, rot=(math.radians(72), 0, 0), n=2, spinning=-1)
    orb = empty('orb', parent=root); drive(orb, 'rotation_euler', 2, T(-1))
    icons = ('circle', 'peak', 'diamond', 'heart')
    tiles = ('glass_mag', 'glass_cyan', 'glass_lilac', 'glass_mag')
    for k in range(4):
        a = k*TAU/4
        e = empty(f'te{k}', loc=(0.66*math.cos(a), 0.66*math.sin(a), -0.15 + 0.1*k), parent=orb)
        drive(e, 'location', 2, f"{-0.15 + 0.1*k}+0.05*sin({T(2, k)})")
        tl = empty(f'tl{k}', rot=(math.radians(80), 0, a + math.pi/2), parent=e)
        rbox(f'tile{k}', 0.22, 0.22, 0.06, bev=0.06, seg=5, mat=M[tiles[k]], parent=tl)
        ic = icons[k]; z = 0.034
        if ic == 'circle': cyl(f'ic{k}', 0.05, 0.01, loc=(0, 0, z), verts=48, mat=M['g_white'], parent=tl)
        elif ic == 'peak': cyl(f'ic{k}', 0.07, 0.01, loc=(0, -0.01, z), verts=3, rot=(0, 0, math.pi/2), mat=M['g_gold'], parent=tl)
        elif ic == 'diamond': rbox(f'ic{k}', 0.07, 0.07, 0.01, loc=(0, 0, z), rot=(0, 0, math.pi/4), bev=0.005, seg=1, mat=M['g_mag'], parent=tl)
        else:
            sphere(f'ic{k}', 0.04, loc=(0, 0, z), mat=M['g_red'], parent=tl, seg=16).scale = (1, 1, 0.2)
    moon('m', 0.07, loc=(-0.5, -0.1, 0.62), parent=root, ring=True, ring_mat=M['gold'])
    sparkles('sp', 9, 0.95, parent=root, zr=(-0.7, 0.7), seed=91)
    return dict(tilt_x=10, z=0.0, scale=0.9, yaw=-0.35, rock=0.5)

BUILD = dict(laptop=build_laptop, signet=build_signet, mobius=build_mobius, gyro=build_gyro, target=build_target,
             bag=build_bag, chain=build_chain, sign=build_sign, box=build_box, lens=build_lens, phone=build_phone)
cfg = BUILD[NAME]()
root.rotation_euler = (math.radians(cfg['tilt_x']), 0, 0)
root.scale = (cfg['scale'],)*3
drive(root, 'location', 2, f"{cfg['z']}+0.03*sin({T(1)})")
yaw = cfg.get('yaw', 0.0)
spin.driver_remove('rotation_euler', 2)
if cfg.get('rock'): drive(spin, 'rotation_euler', 2, f"{yaw}+{cfg['rock']}*sin({T(1)})")
else: drive(spin, 'rotation_euler', 2, f"{yaw}+{T(1)}")

# ---------------- shared stage: "Moonrise Curios" ----------------
# Every discipline object floats over the same pocket-sized ridge-line island
# (the site's scan-line mountains), ringed by one gold halo with drifting moon
# beads, with moon-dust motes rising off it. Same tilt, size and lighting for all 11.
stage = empty('stage', loc=(0, 0, -0.66), rot=(math.radians(14), 0, 0))
isl = empty('isl', parent=stage); drive(isl, 'location', 2, f"0.018*sin({T(1, 1.6)})")
_isl, _ = terrain('island', R=0.47, peaks=((-0.22, 0.12, 0.16, 0.1), (0.24, 0.08, 0.12, 0.09), (0.05, 0.26, 0.1, 0.09), (-0.05, -0.24, 0.05, 0.1)),
        res=140, seed=17, rough=0.006, parent=isl, freq=46, lstr=7.0, sheen=0.0, floor=0.0)
_bi = _isl.data.materials[0].node_tree.nodes['Principled BSDF'].inputs
_bi['Roughness'].default_value = 0.8; _bi['Specular IOR Level'].default_value = 0.0; _bi['Sheen Weight'].default_value = 0.0; _bi['Base Color'].default_value = (0.004, 0.003, 0.008, 1)
lathe('crystal', [(0, -0.4), (0.06, -0.31), (0.21, -0.15), (0.39, -0.04), (0.475, -0.004), (0.475, 0.0), (0, 0.0)], segs=9,
      mat=M['obsidian'], parent=isl, sharp=15)
sphere('tip', 0.028, loc=(0, 0, -0.41), mat=M['g_mag'], parent=isl, seg=16)
torus('halo_g', 0.57, 0.007, mat=M['gold'], parent=isl, maj=192, mnr=10)
hb = empty('beads', parent=isl); drive(hb, 'rotation_euler', 2, T(1/12))
for k in range(24):
    a = k*TAU/24
    o = sphere(f'bd{k}', 0.008 if k % 4 else 0.012, loc=(0.63*math.cos(a), 0.63*math.sin(a), 0), mat=M['g_white'] if k % 4 else M['g_gold'], parent=hb, seg=12)
rnd_ = random.Random(77)
for k in range(10):
    a = rnd_.uniform(0, TAU); rr = rnd_.uniform(0.12, 0.42); ph = k/10
    o = sphere(f'mote{k}', 0.009, loc=(rr*math.cos(a), rr*math.sin(a), 0), mat=M['g_white' if k % 2 else 'g_gold'], parent=isl, seg=10)
    P_ = f"fmod((frame-1)/{N}+{ph},1.0)"
    drive(o, 'location', 2, f"0.05+0.75*{P_}")
    for ax in range(3): drive(o, 'scale', ax, f"sin(pi*{P_})")

# ---------------- camera ----------------
cam_d = bpy.data.cameras.new('cam'); cam_d.lens = 98; cam_d.sensor_width = 36
cam = bpy.data.objects.new('cam', cam_d); col.objects.link(cam)
cam.location = (0, -7.2, 0.9); scn.camera = cam
tgt = empty('camt', loc=(0, 0, 0.0))
tr = cam.constraints.new('TRACK_TO'); tr.target = tgt; tr.track_axis = 'TRACK_NEGATIVE_Z'; tr.up_axis = 'UP_Y'

# ---------------- lights: site palette rim light (magenta / purple / cyan) + soft lilac key ----------------
def area(name, color, power, loc, size, sz2=None):
    l = bpy.data.lights.new(name, 'AREA'); l.color = hexc(color)[:3]; l.energy = power
    l.shape = 'RECTANGLE'; l.size = size; l.size_y = sz2 or size
    o = bpy.data.objects.new(name, l); o.location = loc; col.objects.link(o)
    c = o.constraints.new('TRACK_TO'); c.target = tgt; c.track_axis = 'TRACK_NEGATIVE_Z'; c.up_axis = 'UP_Y'
    return o
area('key', '#f1e8ff', 700, (-3.0, -3.4, 3.4), 2.4)
area('rim_mag', MAG, 1500, (3.6, 2.6, 1.4), 1.2, 3.5)
area('rim_pur', '#9b3cff', 2200, (-3.6, 3.0, 0.8), 1.2, 3.5)
area('under_cyan', CYAN, 260, (2.6, -2.4, -2.6), 2.0)
area('gold', '#ffd9a0', 240, (2.8, -3.6, 2.6), 1.5)
area('top', '#ffffff', 140, (0, 0.5, 4.5), 4.0, 0.6)

def strip(name, color, strength, loc, sx, sy):
    bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=0.5)
    bmesh.ops.scale(bm, vec=(sx, sy, 1), verts=bm.verts)
    o = mesh_obj(name, bm); o.location = loc; col.objects.link(o)
    c = o.constraints.new('TRACK_TO'); c.target = tgt; c.track_axis = 'TRACK_Z'; c.up_axis = 'UP_Y'
    o.data.materials.append(glow(name + 'm', color, strength))
    o.visible_camera = False; o.visible_diffuse = False; o.visible_shadow = False
    return o
strip('s_mag', MAG, 5.0, (4.5, -0.6, 0.6), 0.5, 6)
strip('s_pur', '#9b3cff', 6.0, (-4.5, -1.0, 0.5), 0.5, 6)
strip('s_cyan', CYAN, 2.5, (2.0, -4.6, -1.8), 4, 0.35)
strip('s_white', '#ffffff', 3.0, (-2.0, -5.0, 1.5), 0.35, 4)
strip('s_gold', '#ffd9a0', 3.0, (0.0, -3.0, 4.0), 6, 0.5)

w = bpy.data.worlds.new('w'); scn.world = w; w.use_nodes = True; nt = w.node_tree; nt.nodes.clear()
o_ = nt.nodes.new('ShaderNodeOutputWorld'); lp = nt.nodes.new('ShaderNodeLightPath')
grad = nt.nodes.new('ShaderNodeTexGradient'); tcw = nt.nodes.new('ShaderNodeTexCoord')
rmp = nt.nodes.new('ShaderNodeValToRGB'); rmp.color_ramp.elements[0].color = (0.004, 0.02, 0.03, 1); rmp.color_ramp.elements[1].color = (0.06, 0.012, 0.07, 1)
nt.links.new(tcw.outputs['Generated'], grad.inputs[0]); nt.links.new(grad.outputs['Fac'], rmp.inputs[0])
bg = nt.nodes.new('ShaderNodeBackground'); nt.links.new(rmp.outputs[0], bg.inputs['Color'])
blk = nt.nodes.new('ShaderNodeBackground'); blk.inputs['Color'].default_value = (0, 0, 0, 1)
mx = nt.nodes.new('ShaderNodeMixShader')
nt.links.new(lp.outputs['Is Camera Ray'], mx.inputs[0]); nt.links.new(bg.outputs[0], mx.inputs[1]); nt.links.new(blk.outputs[0], mx.inputs[2])
nt.links.new(mx.outputs[0], o_.inputs[0])

# ---------------- render + bloom ----------------
r = scn.render; r.engine = 'CYCLES'
scn.cycles.device = 'CPU'; scn.cycles.samples = SAMPLES; scn.cycles.use_denoising = True
scn.cycles.denoiser = 'OPENIMAGEDENOISE'; scn.cycles.use_adaptive_sampling = True; scn.cycles.adaptive_threshold = 0.02
scn.cycles.max_bounces = 10; scn.cycles.transmission_bounces = 10; scn.cycles.glossy_bounces = 6
scn.cycles.transparent_max_bounces = 12; scn.cycles.caustics_reflective = False; scn.cycles.caustics_refractive = False
scn.cycles.blur_glossy = 1.0
r.resolution_x = r.resolution_y = RES; r.resolution_percentage = 100
scn.view_settings.view_transform = 'AgX'; scn.view_settings.look = 'AgX - Medium High Contrast'
r.image_settings.file_format = 'PNG'; r.image_settings.color_depth = '8'
scn.use_nodes = True; ct = scn.node_tree; ct.nodes.clear()
rl = ct.nodes.new('CompositorNodeRLayers'); comp = ct.nodes.new('CompositorNodeComposite')
g1 = ct.nodes.new('CompositorNodeGlare'); g1.glare_type = 'FOG_GLOW'; g1.quality = 'HIGH'; g1.threshold = 1.0; g1.size = 7; g1.mix = -0.72
g2 = ct.nodes.new('CompositorNodeGlare'); g2.glare_type = 'STREAKS'; g2.quality = 'HIGH'; g2.threshold = 2.5; g2.streaks = 4
g2.angle_offset = math.radians(45); g2.fade = 0.86; g2.mix = -0.86
ct.links.new(rl.outputs['Image'], g1.inputs['Image']); ct.links.new(g1.outputs['Image'], g2.inputs['Image']); ct.links.new(g2.outputs['Image'], comp.inputs['Image'])
scn.frame_start = 1; scn.frame_end = N

# ---------------- fit check: every vertex must stay inside the circle's solid zone ----------------
from bpy_extras.object_utils import world_to_camera_view
def fit(frames=(1, 13, 25, 37, 49, 61, 73, 85)):
    worst = 0.0; who = ''
    dg = bpy.context.evaluated_depsgraph_get()
    for f in frames:
        scn.frame_set(f); dg = bpy.context.evaluated_depsgraph_get()
        for o in scn.objects:
            if o.type not in ('MESH', 'CURVE') or o.hide_render or not o.visible_camera: continue
            oe = o.evaluated_get(dg)
            try: me = oe.to_mesh()
            except Exception: continue
            mw = oe.matrix_world; step = max(1, len(me.vertices)//400)
            for vi in range(0, len(me.vertices), step):
                v = me.vertices[vi]
                p = world_to_camera_view(scn, cam, mw @ v.co)
                rr = math.hypot(p.x - 0.5, p.y - 0.5)/0.5
                if rr > worst: worst = rr; who = f'{o.name}@{f}'
            oe.to_mesh_clear()
    print(f'FIT {NAME} max_r={worst:.3f} ({who})')
if os.environ.get('FIT', '1') == '1': fit()

os.makedirs(OUT, exist_ok=True)
frames = [int(x) for x in ONLY.split(',')] if ONLY else range(1, N+1)
for f in frames:
    path = os.path.join(OUT, f'{f:04d}.png')
    if os.path.exists(path): continue
    scn.frame_set(f); r.filepath = path
    bpy.ops.render.render(write_still=True)
