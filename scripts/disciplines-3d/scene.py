import bpy, bmesh, math, sys, os
from mathutils import Vector, Matrix

argv = sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
NAME = argv[0] if argv else 'laptop'
OUT = argv[1] if len(argv) > 1 else '/tmp/r'
N = int(argv[2]) if len(argv) > 2 else 120
SAMPLES = int(argv[3]) if len(argv) > 3 else 48
RES = int(argv[4]) if len(argv) > 4 else 720
ONLY = argv[5] if len(argv) > 5 else ''   # e.g. "1,31,61"
TAU = math.tau

bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene
col = scn.collection

# ---------------- materials ----------------
def hexc(h, a=1.0):
    h = h.lstrip('#'); c = [int(h[i:i+2], 16)/255 for i in (0, 2, 4)]
    lin = [x/12.92 if x <= 0.04045 else ((x+0.055)/1.055)**2.4 for x in c]
    return (*lin, a)

RED, MAG, GOLD = '#ff2d4a', '#ff4fc8', '#e8b04a'

def principled(name, base='#000000', metal=0.0, rough=0.1, trans=0.0, ior=1.45, coat=0.0, emis=None, estr=0.0, spec=0.5):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = hexc(base)
    b.inputs['Metallic'].default_value = metal
    b.inputs['Roughness'].default_value = rough
    b.inputs['Transmission Weight'].default_value = trans
    b.inputs['IOR'].default_value = ior
    b.inputs['Coat Weight'].default_value = coat
    b.inputs['Specular IOR Level'].default_value = spec
    if emis:
        b.inputs['Emission Color'].default_value = hexc(emis)
        b.inputs['Emission Strength'].default_value = estr
    return m

M = {
 'obsidian': principled('obsidian', '#0e0c12', rough=0.07, coat=1.0, spec=0.9),
 'obsidian_m': principled('obsidian_m', '#16131b', rough=0.3, spec=0.7),
 'gold': principled('gold', GOLD, metal=1.0, rough=0.16),
 'gold_b': principled('gold_b', '#c98f2e', metal=1.0, rough=0.32),
 'glass': principled('glass', '#ffffff', rough=0.02, trans=1.0, ior=1.5),
 'glass_mag': principled('glass_mag', '#ffb3ea', rough=0.03, trans=1.0, ior=1.5),
 'glass_red': principled('glass_red', '#ff8a96', rough=0.03, trans=1.0, ior=1.5),
 'red': principled('red', '#b0081e', rough=0.2, coat=0.6, emis=RED, estr=0.6),
 'red_glow': principled('red_glow', '#000000', emis=RED, estr=3.5),
 'mag_glow': principled('mag_glow', '#000000', emis=MAG, estr=2.6),
 'gold_glow': principled('gold_glow', '#000000', emis='#ffc469', estr=2.0),
 'wax': principled('wax', '#9a0618', rough=0.28, coat=0.5, spec=0.5),
}

def screen_mat(name, top='#2a0420', bot='#5a0614', strength=1.6):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = hexc(bot); ramp.color_ramp.elements[1].color = hexc(top)
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Strength'].default_value = strength
    gl = nt.nodes.new('ShaderNodeBsdfGlossy'); gl.inputs['Roughness'].default_value = 0.05
    gl.inputs['Color'].default_value = (0.04, 0.04, 0.04, 1)
    add = nt.nodes.new('ShaderNodeAddShader')
    nt.links.new(tc.outputs['UV'], sep.inputs[0]); nt.links.new(sep.outputs['Y'], ramp.inputs[0])
    nt.links.new(ramp.outputs['Color'], em.inputs['Color'])
    nt.links.new(em.outputs[0], add.inputs[0]); nt.links.new(gl.outputs[0], add.inputs[1])
    nt.links.new(add.outputs[0], out.inputs[0])
    return m

# ---------------- helpers ----------------
def link(o, parent=None, mat=None):
    col.objects.link(o)
    if parent: o.parent = parent
    if mat:
        o.data.materials.clear(); o.data.materials.append(mat)
    return o

def mesh_obj(name, bm):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    return bpy.data.objects.new(name, me)

def smooth(o, angle=35):
    for p in o.data.polygons: p.use_smooth = True
    m = o.modifiers.new('ws', 'WEIGHTED_NORMAL') if False else None
    o.data.set_sharp_from_angle(angle=math.radians(angle)) if hasattr(o.data, 'set_sharp_from_angle') else None

def bevel(o, w, seg=4, limit='ANGLE'):
    b = o.modifiers.new('bev', 'BEVEL'); b.width = w; b.segments = seg; b.limit_method = limit
    b.harden_normals = False
    return b

def rbox(name, sx, sy, sz, loc=(0,0,0), rot=(0,0,0), bev=0.03, seg=4, mat=None, parent=None):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=(sx, sy, sz), verts=bm.verts)
    o = mesh_obj(name, bm); o.location = loc; o.rotation_euler = rot
    link(o, parent, mat)
    if bev > 0: bevel(o, bev, seg)
    smooth(o); return o

def cyl(name, r, depth, loc=(0,0,0), rot=(0,0,0), verts=96, bev=0.0, seg=3, mat=None, parent=None, r2=None):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=verts, radius1=r, radius2=r if r2 is None else r2, depth=depth)
    o = mesh_obj(name, bm); o.location = loc; o.rotation_euler = rot
    link(o, parent, mat)
    if bev > 0: bevel(o, bev, seg)
    smooth(o); return o

def torus(name, R, r, loc=(0,0,0), rot=(0,0,0), mat=None, parent=None, maj=128, mnr=32):
    bm = bmesh.new()
    verts = []
    for i in range(maj):
        u = TAU*i/maj
        ring = []
        for j in range(mnr):
            v = TAU*j/mnr
            ring.append(bm.verts.new(((R + r*math.cos(v))*math.cos(u), (R + r*math.cos(v))*math.sin(u), r*math.sin(v))))
        verts.append(ring)
    for i in range(maj):
        for j in range(mnr):
            a = verts[i][j]; b = verts[(i+1) % maj][j]; c = verts[(i+1) % maj][(j+1) % mnr]; d = verts[i][(j+1) % mnr]
            bm.faces.new((a, b, c, d))
    o = mesh_obj(name, bm); o.location = loc; o.rotation_euler = rot
    link(o, parent, mat)
    for p in o.data.polygons: p.use_smooth = True
    return o

def lathe(name, prof, segs=128, loc=(0,0,0), rot=(0,0,0), mat=None, parent=None):
    """prof: list of (r, z) from bottom to top; r=0 endpoints close the shape."""
    bm = bmesh.new(); rings = []
    for (r, z) in prof:
        if r < 1e-5:
            rings.append([bm.verts.new((0, 0, z))])
        else:
            rings.append([bm.verts.new((r*math.cos(TAU*i/segs), r*math.sin(TAU*i/segs), z)) for i in range(segs)])
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
    for p in o.data.polygons: p.use_smooth = True
    return o

def empty(name, loc=(0,0,0), rot=(0,0,0), parent=None):
    e = bpy.data.objects.new(name, None); e.location = loc; e.rotation_euler = rot
    return link(e, parent)

def drive(o, path, idx, expr):
    d = o.driver_add(path, idx).driver; d.type = 'SCRIPTED'; d.expression = expr
    d.use_self = False

def T(k=1, phase=0.0):  # loop-safe angle expression: k full turns over the loop
    return f"{k}*2*pi*((frame-1)/{N})+{phase}"

def curve_tube(name, pts, r, mat=None, parent=None, cyclic=False, res=24):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'
    sp = cu.splines.new('NURBS' if not cyclic else 'NURBS'); sp.points.add(len(pts)-1)
    for p, c in zip(sp.points, pts): p.co = (*c, 1)
    sp.use_cyclic_u = cyclic; sp.use_endpoint_u = not cyclic; sp.order_u = 4
    cu.bevel_depth = r; cu.bevel_resolution = 6; cu.resolution_u = res; cu.use_fill_caps = True
    o = bpy.data.objects.new(name, cu); link(o, parent)
    if mat: cu.materials.append(mat)
    return o

# ---------------- rig: pivot (tilt) -> spin (Z turn) -> bob ----------------
root = empty('root')
spin = empty('spin', parent=root)
drive(spin, 'rotation_euler', 2, T(1))

# ---------------- objects ----------------
def build_laptop():
    tilt = empty('tilt', rot=(0, 0, 0), parent=spin)
    base = rbox('base', 1.7, 1.15, 0.055, loc=(0, 0, -0.42), bev=0.025, mat=M['obsidian'], parent=tilt)
    # keyboard deck keys
    for ix in range(12):
        for iy in range(5):
            rbox(f'k{ix}{iy}', 0.105, 0.095, 0.02, loc=(-0.66 + ix*0.12, 0.05 + iy*0.105 - 0.0, -0.385), bev=0.008, seg=2, mat=M['obsidian_m'], parent=tilt)
    rbox('pad', 0.55, 0.32, 0.004, loc=(0, -0.34, -0.392), bev=0.01, seg=2, mat=M['obsidian_m'], parent=tilt)
    rbox('lip', 1.7, 0.012, 0.012, loc=(0, -0.575, -0.395), bev=0.004, mat=M['gold'], parent=tilt)
    hinge = empty('hinge', loc=(0, 0.57, -0.40), rot=(math.radians(-18), 0, 0), parent=tilt)
    lid = rbox('lid', 1.7, 0.045, 1.12, loc=(0, 0, 0.56), bev=0.025, mat=M['obsidian'], parent=hinge)
    cyl('hingebar', 0.03, 1.2, loc=(0, 0, 0.0), rot=(0, math.radians(90), 0), mat=M['gold'], parent=hinge)
    scr = rbox('screen', 1.58, 0.004, 1.0, loc=(0, -0.025, 0.56), bev=0.0, mat=screen_mat('scr', '#3a0628', '#12020a', 1.4), parent=hinge)
    # UV for gradient: use generated coords -> simpler: assign UV by z
    me = scr.data; me.uv_layers.new()
    for poly in me.polygons:
        for li in poly.loop_indices:
            v = me.vertices[me.loops[li].vertex_index].co
            me.uv_layers[0].data[li].uv = (v.x/1.58 + 0.5, v.z/1.0 + 0.5)
    # abstract website layout (no text)
    ui = [(0, 0.40, 1.4, 0.07, 'gold_glow', 0.5), (-0.33, 0.12, 0.66, 0.34, 'mag_glow', 0.9), (0.40, 0.17, 0.5, 0.06, 'red_glow', 0.6),
          (0.40, 0.06, 0.36, 0.035, 'mag_glow', 0.35), (0.34, -0.04, 0.24, 0.07, 'red_glow', 1.0),
          (-0.46, -0.28, 0.4, 0.24, 'mag_glow', 0.35), (0.0, -0.28, 0.4, 0.24, 'red_glow', 0.3), (0.46, -0.28, 0.4, 0.24, 'gold_glow', 0.25)]
    for i, (x, z, w, h, mk, s) in enumerate(ui):
        m = M[mk].copy(); m.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value *= s*0.6
        rbox(f'ui{i}', w, 0.003, h, loc=(x, -0.029, 0.56 + z), bev=0.012, seg=3, mat=m, parent=hinge)
    rbox('bezelglow', 1.62, 0.002, 0.004, loc=(0, -0.026, 0.056), bev=0, mat=M['red_glow'], parent=hinge)
    return dict(tilt_x=18, z=0.0, scale=0.86)

def build_signet():
    holder = empty('h', parent=spin, loc=(0.16, 0.0, 0.46), rot=(math.radians(26), math.radians(-8), 0))
    prof = [(0, -0.62), (0.40, -0.62), (0.42, -0.60), (0.42, -0.50), (0.36, -0.46), (0.20, -0.40), (0.15, -0.30),
            (0.14, -0.10), (0.17, 0.0), (0.15, 0.08), (0.13, 0.15), (0.16, 0.25), (0.24, 0.38), (0.27, 0.50),
            (0.24, 0.62), (0.15, 0.70), (0, 0.73)]
    # split: gold collar/base, obsidian-glass handle
    lathe('base', prof[:7] + [(0, -0.30)], mat=M['gold'], parent=holder)
    lathe('neck', [(0, -0.31), (0.15, -0.31), (0.14, -0.10), (0.17, 0.0), (0.15, 0.08), (0, 0.08)], mat=M['gold_b'], parent=holder)
    lathe('handle', [(0, 0.07), (0.15, 0.07), (0.11, 0.18), (0.12, 0.30), (0.20, 0.45), (0.24, 0.56), (0.22, 0.66), (0.14, 0.74), (0.06, 0.77), (0, 0.775)], mat=M['obsidian'], parent=holder)
    torus('band1', 0.165, 0.012, loc=(0, 0, 0.08), mat=M['gold'], parent=holder)
    torus('band2', 0.112, 0.01, loc=(0, 0, 0.20), mat=M['gold'], parent=holder)
    # wax seal puck below with embossed diamond motif
    seal = empty('seal', loc=(-0.06, 0, -0.62), parent=spin)
    lathe('wax', [(0, -0.05), (0.40, -0.05), (0.46, -0.03), (0.47, 0.0), (0.44, 0.03), (0.39, 0.045), (0, 0.045)], segs=96, mat=M['wax'], parent=seal)
    for k in range(4):
        a = k*TAU/4
        o = rbox(f'emb{k}', 0.11, 0.11, 0.03, loc=(0.13*math.cos(a), 0.13*math.sin(a), 0.05), rot=(0, 0, a + math.pi/4), bev=0.012, seg=2, mat=M['wax'], parent=seal)
    rbox('embc', 0.12, 0.12, 0.04, loc=(0, 0, 0.055), rot=(0, 0, math.pi/4), bev=0.015, seg=2, mat=M['wax'], parent=seal)
    torus('embring', 0.33, 0.014, loc=(0, 0, 0.045), mat=M['wax'], parent=seal)
    return dict(tilt_x=34, z=-0.04, scale=0.88)

def mobius_mesh(name, R=0.78, w=0.30, n=480, m=12):
    bm = bmesh.new(); uv = bm.loops.layers.uv.new()
    grid = []
    for i in range(n):
        u = TAU*i/n
        row = []
        for j in range(m+1):
            v = -w + 2*w*j/m
            row.append(bm.verts.new(((R + v*math.cos(u/2))*math.cos(u), (R + v*math.cos(u/2))*math.sin(u), v*math.sin(u/2))))
        grid.append(row)
    for i in range(n):
        i2 = (i+1) % n
        for j in range(m):
            if i2 == 0:  # half twist: v flips
                a, b, c, d = grid[i][j], grid[0][m-j], grid[0][m-j-1], grid[i][j+1]
            else:
                a, b, c, d = grid[i][j], grid[i2][j], grid[i2][j+1], grid[i][j+1]
            f = bm.faces.new((a, b, c, d))
            us = (i/n, (i+1)/n)
            for lp, (uu, vv) in zip(f.loops, [(us[0], j/m), (us[1], j/m), (us[1], (j+1)/m), (us[0], (j+1)/m)]):
                lp[uv].uv = (uu, vv)
    return mesh_obj(name, bm)

def film_mat():
    m = bpy.data.materials.new('film'); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    N_ = nt.nodes.new; L = nt.links.new
    out = N_('ShaderNodeOutputMaterial')
    tc = N_('ShaderNodeTexCoord'); sep = N_('ShaderNodeSeparateXYZ'); L(tc.outputs['UV'], sep.inputs[0])
    def math_(op, a, b=None, clamp=False):
        n = N_('ShaderNodeMath'); n.operation = op; n.use_clamp = clamp
        (L(a, n.inputs[0]) if not isinstance(a, (int, float)) else n.inputs[0].__setattr__('default_value', a))
        if b is not None:
            (L(b, n.inputs[1]) if not isinstance(b, (int, float)) else n.inputs[1].__setattr__('default_value', b))
        return n.outputs[0]
    U, V = sep.outputs['X'], sep.outputs['Y']
    dv = math_('ABSOLUTE', math_('SUBTRACT', V, 0.5))
    # perforations: band 0.36..0.45, 96 holes
    fu = math_('FRACT', math_('MULTIPLY', U, 96))
    band = math_('MULTIPLY', math_('GREATER_THAN', dv, 0.355), math_('LESS_THAN', dv, 0.445))
    holeu = math_('MULTIPLY', math_('GREATER_THAN', fu, 0.3), math_('LESS_THAN', fu, 0.7))
    hole = math_('MULTIPLY', band, holeu)
    # frames: center band |dv|<0.29, 24 frames
    ff = math_('FRACT', math_('MULTIPLY', U, 24))
    win = math_('MULTIPLY', math_('LESS_THAN', dv, 0.285), math_('MULTIPLY', math_('GREATER_THAN', ff, 0.05), math_('LESS_THAN', ff, 0.95)))
    idx = math_('FRACT', math_('MULTIPLY', math_('FLOOR', math_('MULTIPLY', U, 24)), 0.3334))
    ramp = N_('ShaderNodeValToRGB'); cr = ramp.color_ramp; cr.interpolation = 'CONSTANT'
    cr.elements[0].position = 0.0; cr.elements[0].color = hexc(RED)
    cr.elements[1].position = 0.32; cr.elements[1].color = hexc(MAG)
    e = cr.elements.new(0.65); e.color = hexc('#ffb547')
    L(idx, ramp.inputs[0])
    # gradient inside each frame for a "shot" feel
    grad = N_('ShaderNodeMixRGB'); grad.blend_type = 'MULTIPLY'; grad.inputs[0].default_value = 1.0
    L(ramp.outputs[0], grad.inputs[1])
    g2 = N_('ShaderNodeValToRGB'); g2.color_ramp.elements[0].color = (0.25, 0.25, 0.25, 1); g2.color_ramp.elements[1].color = (1, 1, 1, 1)
    L(math_('ADD', math_('MULTIPLY', V, 1.0), 0.0), g2.inputs[0]); L(g2.outputs[0], grad.inputs[2])
    body = N_('ShaderNodeBsdfPrincipled'); body.inputs['Base Color'].default_value = hexc('#070609')
    body.inputs['Roughness'].default_value = 0.12; body.inputs['Coat Weight'].default_value = 1.0
    frame = N_('ShaderNodeBsdfPrincipled'); frame.inputs['Base Color'].default_value = (0.02, 0.02, 0.02, 1)
    frame.inputs['Roughness'].default_value = 0.05; frame.inputs['Transmission Weight'].default_value = 0.6
    L(grad.outputs[0], frame.inputs['Emission Color']); frame.inputs['Emission Strength'].default_value = 1.4
    edge = N_('ShaderNodeBsdfPrincipled'); edge.inputs['Base Color'].default_value = hexc(GOLD)
    edge.inputs['Metallic'].default_value = 1.0; edge.inputs['Roughness'].default_value = 0.2
    edgemask = math_('GREATER_THAN', dv, 0.47)
    mix1 = N_('ShaderNodeMixShader'); L(win, mix1.inputs[0]); L(body.outputs[0], mix1.inputs[1]); L(frame.outputs[0], mix1.inputs[2])
    mix2 = N_('ShaderNodeMixShader'); L(edgemask, mix2.inputs[0]); L(mix1.outputs[0], mix2.inputs[1]); L(edge.outputs[0], mix2.inputs[2])
    tr = N_('ShaderNodeBsdfTransparent')
    mix3 = N_('ShaderNodeMixShader'); L(hole, mix3.inputs[0]); L(mix2.outputs[0], mix3.inputs[1]); L(tr.outputs[0], mix3.inputs[2])
    L(mix3.outputs[0], out.inputs[0])
    return m

def build_mobius():
    o = mobius_mesh('mobius'); link(o, spin, film_mat())
    for p in o.data.polygons: p.use_smooth = True
    s = o.modifiers.new('sol', 'SOLIDIFY'); s.thickness = 0.012; s.offset = 0
    return dict(tilt_x=28, z=0.0, scale=0.84)

def build_gyro():
    outer = empty('outer', parent=spin)
    torus('r1', 0.92, 0.045, mat=M['glass'], parent=outer, maj=160, mnr=40)
    torus('r1g', 0.92, 0.012, mat=M['gold'], parent=outer, maj=160, mnr=16).scale = (1, 1, 1)
    mid = empty('mid', parent=outer); drive(mid, 'rotation_euler', 0, T(1, 0.6))
    torus('r2', 0.72, 0.042, rot=(0, math.radians(90), 0), mat=M['glass_mag'], parent=mid, maj=160, mnr=40)
    inn = empty('inn', parent=mid); drive(inn, 'rotation_euler', 1, T(2, 1.1))
    torus('r3', 0.52, 0.04, rot=(math.radians(90), 0, 0), mat=M['glass_red'], parent=inn, maj=128, mnr=40)
    core = empty('core', parent=inn); drive(core, 'rotation_euler', 2, T(-2))
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=1, radius=0.22)
    ico = mesh_obj('ico', bm); link(ico, core, M['gold']); bevel(ico, 0.01, 2)
    lathe('pin', [(0, -0.98), (0.012, -0.98), (0.012, 0.98), (0, 0.98)], segs=24, mat=M['gold'], parent=outer)
    return dict(tilt_x=20, z=0.0, scale=1.0)

def build_target():
    t = empty('t', rot=(math.radians(90), 0, 0), parent=spin)
    rings = [(0.92, 0.06, 'glass'), (0.74, 0.09, 'glass_mag'), (0.56, 0.12, 'glass'), (0.38, 0.15, 'glass_mag'), (0.2, 0.18, 'red')]
    for i, (r, d, mk) in enumerate(rings):
        cyl(f'ring{i}', r, d, verts=128, bev=0.012, seg=3, mat=M[mk], parent=t)
        torus(f'g{i}', r, 0.008, loc=(0, 0, d/2), mat=M['gold'], parent=t, maj=128, mnr=12)
    # dart stuck in center, angled
    dart = empty('dart', loc=(0, 0, 0.09), rot=(math.radians(-14), math.radians(10), 0), parent=t)
    lathe('shaft', [(0, 0.0), (0.012, 0.03), (0.02, 0.1), (0.02, 0.62), (0.03, 0.66), (0.03, 0.72), (0, 0.74)], segs=48, mat=M['gold'], parent=dart)
    for k in range(3):
        a = k*TAU/3
        f = rbox(f'fl{k}', 0.004, 0.11, 0.18, loc=(0.06*math.cos(a), 0.06*math.sin(a), 0.62), rot=(0, 0, a + math.pi/2), bev=0.002, seg=1, mat=M['red'], parent=dart)
    return dict(tilt_x=12, z=0.0, scale=1.0, rock=0.75)

def build_bag():
    b = empty('b', parent=spin)
    body = rbox('bag', 1.0, 0.6, 1.05, loc=(0, 0, -0.18), bev=0.02, mat=M['obsidian'], parent=b)
    rbox('band', 1.012, 0.612, 0.07, loc=(0, 0, 0.30), bev=0.01, mat=M['gold'], parent=b)
    rbox('gus', 0.006, 0.3, 0.9, loc=(0.503, 0, -0.2), bev=0.002, seg=1, mat=M['obsidian_m'], parent=b)
    rbox('gus2', 0.006, 0.3, 0.9, loc=(-0.503, 0, -0.2), bev=0.002, seg=1, mat=M['obsidian_m'], parent=b)
    for s in (-1, 1):
        pts = [(-0.22, s*0.305, 0.33), (-0.24, s*0.32, 0.6), (-0.1, s*0.32, 0.82), (0.1, s*0.32, 0.82), (0.24, s*0.32, 0.6), (0.22, s*0.305, 0.33)]
        curve_tube(f'handle{s}', pts, 0.022, mat=M['gold'], parent=b)
        for x in (-0.22, 0.22):
            torus(f'grom{s}{x}', 0.03, 0.009, loc=(x, s*0.303, 0.33), rot=(math.radians(90), 0, 0), mat=M['gold'], parent=b, maj=32, mnr=10)
    # glass card leaning out
    card = rbox('card', 0.62, 0.012, 0.4, loc=(0.0, -0.06, 0.48), rot=(math.radians(-8), 0, math.radians(8)), bev=0.03, seg=4, mat=M['glass_mag'], parent=b)
    rbox('chip', 0.1, 0.016, 0.08, loc=(-0.17, -0.072, 0.53), rot=(math.radians(-8), 0, math.radians(8)), bev=0.01, seg=2, mat=M['gold'], parent=b)
    return dict(tilt_x=12, z=0.05, scale=1.0)

def build_chain():
    c = empty('c', parent=spin)
    pos = [(0, 0, 0.42), (-0.48, 0, -0.32), (0.48, 0, -0.32)]
    pos = [(0.0, 0.0, 0.45), (-0.5, 0.3, -0.3), (0.5, -0.3, -0.3)]
    for i, p in enumerate(pos):
        e = empty(f'blk{i}', loc=p, parent=c); drive(e, 'rotation_euler', 2, T(-1 if i % 2 else 1, i))
        rbox(f'glass{i}', 0.5, 0.5, 0.5, bev=0.04, seg=4, mat=M['glass'], parent=e)
        rbox(f'core{i}', 0.2, 0.2, 0.2, rot=(math.radians(35), math.radians(45), 0), bev=0.012, seg=2, mat=M['gold'], parent=e)
        for k in range(4):  # edge accents
            pass
    # links (gold chain segments between blocks)
    for a, b in ((0, 1), (1, 2), (2, 0)):
        A, B = Vector(pos[a]), Vector(pos[b]); mid = (A + B)/2; d = (B - A)
        L = d.length - 0.55
        o = cyl(f'link{a}{b}', 0.018, L, loc=mid, verts=24, mat=M['gold'], parent=c)
        o.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
        for t_ in (0.32, 0.68):
            q = A + d*t_
            nd = torus(f'node{a}{b}{t_}', 0.05, 0.014, loc=q, mat=M['red_glow'] if t_ < 0.5 else M['mag_glow'], parent=c, maj=32, mnr=10)
            nd.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
    return dict(tilt_x=14, z=0.03, scale=1.08)

def build_sign():
    s = empty('s', parent=spin)
    # bracket arm + post stub
    rbox('arm', 1.2, 0.04, 0.04, loc=(0, 0, 0.66), bev=0.01, mat=M['gold'], parent=s)
    cyl('cap1', 0.045, 0.06, loc=(-0.6, 0, 0.66), rot=(0, math.radians(90), 0), mat=M['gold'], parent=s, verts=32)
    curve_tube('scroll', [(-0.6, 0, 0.66), (-0.45, 0, 0.5), (-0.25, 0, 0.56), (-0.1, 0, 0.66)], 0.012, mat=M['gold'], parent=s)
    for x in (-0.36, 0.36):
        cyl(f'chain{x}', 0.008, 0.14, loc=(x, 0, 0.57), verts=12, mat=M['gold'], parent=s)
    sw = empty('swing', loc=(0, 0, 0.5), parent=s); drive(sw, 'rotation_euler', 0, f"0.08*sin({T(2)})")
    rbox('panel', 1.0, 0.07, 0.86, loc=(0, 0, -0.43), bev=0.06, seg=6, mat=M['obsidian'], parent=sw)
    # neon border tube on both faces (rounded rect)
    def rr(w, h, r, n=8):
        pts = []
        for cx, cz, a0 in ((w/2-r, h/2-r, 0), (-w/2+r, h/2-r, 90), (-w/2+r, -h/2+r, 180), (w/2-r, -h/2+r, 270)):
            for k in range(n+1):
                a = math.radians(a0 + 90*k/n); pts.append((cx + r*math.cos(a), cz + r*math.sin(a)))
        return pts
    for side, mk in ((-1, 'red_glow'), (1, 'mag_glow')):
        pts = [(x, side*0.05, z - 0.43) for (x, z) in rr(0.8, 0.66, 0.1)]
        cu = bpy.data.curves.new('neon', 'CURVE'); cu.dimensions = '3D'
        sp = cu.splines.new('POLY'); sp.points.add(len(pts)-1)
        for p, c in zip(sp.points, pts): p.co = (*c, 1)
        sp.use_cyclic_u = True; cu.bevel_depth = 0.012; cu.bevel_resolution = 4
        o = bpy.data.objects.new('neon', cu); link(o, sw); cu.materials.append(M[mk])
        # abstract mark: gold diamond + bar (no text)
        rbox(f'mark{side}', 0.22, 0.02, 0.22, loc=(0, side*0.04, -0.36), rot=(0, math.radians(45), 0), bev=0.02, seg=3, mat=M['gold'], parent=sw)
        rbox(f'bar{side}', 0.44, 0.02, 0.035, loc=(0, side*0.04, -0.64), bev=0.012, seg=2, mat=M['gold'], parent=sw)
    return dict(tilt_x=8, z=0.0, scale=1.0, rock=0.8)

def build_box():
    b = empty('b', parent=spin)
    rbox('box', 0.95, 0.95, 0.62, loc=(0, 0, -0.33), bev=0.02, mat=M['obsidian'], parent=b)
    lid = empty('lid', loc=(0, 0, 0.12), rot=(0, 0, 0), parent=b)
    drive(lid, 'location', 2, f"0.12+0.04*sin({T(2)})")
    rbox('lidb', 1.0, 1.0, 0.16, bev=0.02, mat=M['obsidian'], parent=lid)
    for rot in (0, math.pi/2):
        rbox(f'rib{rot}', 1.012, 0.09, 0.172, rot=(0, 0, rot), bev=0.004, seg=1, mat=M['gold'], parent=lid)
        rbox(f'ribb{rot}', 0.962, 0.09, 0.632, loc=(0, 0, -0.45), rot=(0, 0, rot), bev=0.004, seg=1, mat=M['gold'], parent=b)
    # bow: two loops + knot
    for s in (-1, 1):
        o = torus(f'loop{s}', 0.14, 0.03, loc=(s*0.13, 0, 0.16), rot=(math.radians(90), math.radians(s*25), 0), mat=M['gold'], parent=lid, maj=64, mnr=16)
        o.scale = (1.0, 0.55, 1.0)
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=16, radius=0.065)
    k = mesh_obj('knot', bm); link(k, lid, M['gold']); k.location = (0, 0, 0.12); k.scale = (1.2, 1, 0.8)
    for p in k.data.polygons: p.use_smooth = True
    # inner glow peeking out between lid and box
    rbox('glow', 0.9, 0.9, 0.02, loc=(0, 0, -0.01), bev=0.0, mat=M['mag_glow'], parent=b)
    return dict(tilt_x=30, z=0.06, scale=1.05)

def build_lens():
    t = empty('t', rot=(math.radians(90), 0, 0), parent=spin)
    prof = [(0, -0.75), (0.30, -0.75), (0.32, -0.72), (0.32, -0.62), (0.36, -0.60), (0.36, -0.30), (0.40, -0.28), (0.40, 0.10),
            (0.44, 0.12), (0.46, 0.40), (0.52, 0.44), (0.52, 0.62), (0.48, 0.64), (0.44, 0.64), (0.40, 0.58), (0, 0.58)]
    lathe('barrel', prof, mat=M['obsidian'], parent=t)
    # gold focus ring with knurling
    cyl('focus', 0.405, 0.22, loc=(0, 0, -0.1), verts=128, mat=M['gold'], parent=t)
    for k in range(60):
        a = k*TAU/60
        rbox(f'kn{k}', 0.018, 0.02, 0.2, loc=(0.41*math.cos(a), 0.41*math.sin(a), -0.1), rot=(0, 0, a), bev=0.004, seg=1, mat=M['gold_b'], parent=t)
    torus('redring', 0.475, 0.01, loc=(0, 0, 0.44), mat=M['red_glow'], parent=t, maj=128, mnr=12)
    torus('goldlip', 0.5, 0.014, loc=(0, 0, 0.635), mat=M['gold'], parent=t, maj=128, mnr=12)
    # front glass element (domed) with magenta coating
    lathe('front', [(0, 0.60), (0.43, 0.60), (0.43, 0.63), (0.3, 0.68), (0, 0.70)], mat=M['glass_mag'], parent=t)
    lathe('inner', [(0, 0.45), (0.3, 0.45), (0.3, 0.5), (0, 0.53)], mat=M['glass'], parent=t)
    cyl('aperture', 0.36, 0.01, loc=(0, 0, 0.42), verts=6, mat=M['obsidian_m'], parent=t)
    lathe('innerglow', [(0, 0.40), (0.12, 0.40), (0, 0.41)], mat=M['gold_glow'], parent=t)
    return dict(tilt_x=18, z=0.0, scale=1.0)

def build_phone():
    p = empty('p', parent=spin)
    rbox('phone', 0.82, 0.075, 1.62, bev=0.1, seg=8, mat=M['obsidian'], parent=p)
    rbox('rim', 0.835, 0.06, 1.635, bev=0.1, seg=8, mat=M['gold'], parent=p)
    scr = rbox('screen', 0.74, 0.004, 1.54, loc=(0, -0.039, 0), bev=0.0, mat=screen_mat('pscr', '#3a0628', '#12020a', 1.4), parent=p)
    me = scr.data; me.uv_layers.new()
    for poly in me.polygons:
        for li in poly.loop_indices:
            v = me.vertices[me.loops[li].vertex_index].co
            me.uv_layers[0].data[li].uv = (v.x/0.74 + 0.5, v.z/1.54 + 0.5)
    ui = [(0, 0.55, 0.6, 0.26, 'mag_glow', 0.8), (-0.16, 0.22, 0.28, 0.28, 'red_glow', 0.5), (0.16, 0.22, 0.28, 0.28, 'gold_glow', 0.35),
          (0, -0.05, 0.6, 0.06, 'mag_glow', 0.4), (0, -0.16, 0.6, 0.06, 'mag_glow', 0.25), (0, -0.62, 0.5, 0.1, 'red_glow', 0.9)]
    for i, (x, z, w, h, mk, s) in enumerate(ui):
        m = M[mk].copy(); m.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value *= s*0.6
        rbox(f'ui{i}', w, 0.003, h, loc=(x, -0.043, z), bev=0.03, seg=3, mat=m, parent=p)
    rbox('island', 0.2, 0.004, 0.05, loc=(0, -0.044, 0.71), bev=0.024, seg=4, mat=M['obsidian_m'], parent=p)
    # orbiting glass app tiles
    orb = empty('orb', parent=root); drive(orb, 'rotation_euler', 2, T(-2))
    for k, mk in enumerate(('glass_mag', 'glass', 'glass_red')):
        a = k*TAU/3
        e = empty(f'te{k}', loc=(0.78*math.cos(a), 0.78*math.sin(a), -0.35 + 0.35*k), parent=orb)
        rbox(f'tile{k}', 0.24, 0.24, 0.07, rot=(math.radians(70), 0, a), bev=0.06, seg=5, mat=M[mk], parent=e)
    return dict(tilt_x=10, z=0.0, scale=1.0, rock=0.7)

BUILD = dict(laptop=build_laptop, signet=build_signet, mobius=build_mobius, gyro=build_gyro, target=build_target,
             bag=build_bag, chain=build_chain, sign=build_sign, box=build_box, lens=build_lens, phone=build_phone)
cfg = BUILD[NAME]()
root.rotation_euler = (math.radians(cfg['tilt_x']), 0, 0)
root.location.z = cfg['z']
root.scale = (cfg['scale'],)*3
# re-add bob around cfg z
drive(root, 'location', 2, f"{cfg['z']}+0.035*sin({T(1)})")
if cfg.get('rock'):
    spin.driver_remove('rotation_euler', 2)
    drive(spin, 'rotation_euler', 2, f"{cfg['rock']}*sin({T(1)})")

# ---------------- camera ----------------
cam_d = bpy.data.cameras.new('cam'); cam_d.lens = 98; cam_d.sensor_width = 36
cam = bpy.data.objects.new('cam', cam_d); col.objects.link(cam)
cam.location = (0, -7.2, 0.9); scn.camera = cam
tr = cam.constraints.new('TRACK_TO'); tgt = empty('camt', loc=(0, 0, 0.0)); tr.target = tgt
tr.track_axis = 'TRACK_NEGATIVE_Z'; tr.up_axis = 'UP_Y'

# ---------------- lights (KR8TIV rim lighting) ----------------
def area(name, color, power, loc, size, sz2=None, shape='RECTANGLE'):
    l = bpy.data.lights.new(name, 'AREA'); l.color = hexc(color)[:3]; l.energy = power
    l.shape = shape; l.size = size; l.size_y = sz2 or size
    o = bpy.data.objects.new(name, l); o.location = loc; col.objects.link(o)
    c = o.constraints.new('TRACK_TO'); c.target = tgt; c.track_axis = 'TRACK_NEGATIVE_Z'; c.up_axis = 'UP_Y'
    return o
area('key_gold', '#ffc27a', 800, (-3.0, -3.2, 3.6), 2.2)
area('rim_red', RED, 1400, (-3.6, 3.0, 0.8), 1.2, 3.5)
area('rim_mag', MAG, 1300, (3.6, 2.6, 1.4), 1.2, 3.5)
area('fill', '#d9d4ff', 60, (3.0, -4.0, -1.2), 3.0)
area('top', '#ffffff', 160, (0, 0.5, 4.5), 4.0, 0.6)

# reflection strips: visible to glossy/transmission only
def strip(name, color, strength, loc, sx, sy):
    bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=0.5)
    bmesh.ops.scale(bm, vec=(sx, sy, 1), verts=bm.verts)
    o = mesh_obj(name, bm); o.location = loc; col.objects.link(o)
    c = o.constraints.new('TRACK_TO'); c.target = tgt; c.track_axis = 'TRACK_Z'; c.up_axis = 'UP_Y'
    m = principled(name + 'm', '#000000', emis=color, estr=strength); o.data.materials.append(m)
    o.visible_camera = False; o.visible_diffuse = False; o.visible_shadow = False
    return o
strip('s_red', RED, 5.0, (-4.5, -1.0, 0.5), 0.5, 6)
strip('s_mag', MAG, 5.0, (4.5, -0.6, 0.6), 0.5, 6)
strip('s_gold', '#ffc27a', 4.0, (0.0, -3.0, 4.0), 6, 0.5)
strip('s_white', '#ffffff', 2.5, (-2.0, -5.0, 1.5), 0.35, 4)

# world: pure black to camera; faint purple-black gradient in reflections only
w = bpy.data.worlds.new('w'); scn.world = w; w.use_nodes = True; nt = w.node_tree; nt.nodes.clear()
o_ = nt.nodes.new('ShaderNodeOutputWorld'); lp = nt.nodes.new('ShaderNodeLightPath')
bg = nt.nodes.new('ShaderNodeBackground'); bg.inputs['Color'].default_value = (0.05, 0.018, 0.04, 1); bg.inputs['Strength'].default_value = 1.0
blk = nt.nodes.new('ShaderNodeBackground'); blk.inputs['Color'].default_value = (0, 0, 0, 1)
mx = nt.nodes.new('ShaderNodeMixShader')
nt.links.new(lp.outputs['Is Camera Ray'], mx.inputs[0]); nt.links.new(bg.outputs[0], mx.inputs[1]); nt.links.new(blk.outputs[0], mx.inputs[2])
nt.links.new(mx.outputs[0], o_.inputs[0])

# ---------------- render ----------------
r = scn.render; r.engine = 'CYCLES'
scn.cycles.device = 'CPU'; scn.cycles.samples = SAMPLES; scn.cycles.use_denoising = True
scn.cycles.denoiser = 'OPENIMAGEDENOISE'; scn.cycles.use_adaptive_sampling = True; scn.cycles.adaptive_threshold = 0.02
scn.cycles.max_bounces = 10; scn.cycles.transmission_bounces = 10; scn.cycles.glossy_bounces = 6
scn.cycles.transparent_max_bounces = 12; scn.cycles.caustics_reflective = False; scn.cycles.caustics_refractive = False
scn.cycles.blur_glossy = 1.0
r.resolution_x = r.resolution_y = RES; r.resolution_percentage = 100
r.film_transparent = False
scn.view_settings.view_transform = 'AgX'; scn.view_settings.look = 'AgX - Medium High Contrast'
r.image_settings.file_format = 'PNG'; r.image_settings.color_depth = '8'
scn.frame_start = 1; scn.frame_end = N
os.makedirs(OUT, exist_ok=True)
frames = [int(x) for x in ONLY.split(',')] if ONLY else range(1, N+1)
for f in frames:
    path = os.path.join(OUT, f'{f:04d}.png')
    if os.path.exists(path): continue
    scn.frame_set(f); r.filepath = path
    bpy.ops.render.render(write_still=True)
