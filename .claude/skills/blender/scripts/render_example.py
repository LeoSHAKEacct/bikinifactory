import bpy, sys, math, os
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
GLB, OUT, SHOTS, W, SAMPLES = argv[0], argv[1], argv[2].split(','), int(argv[3]), int(argv[4])
H = W * 9 // 16

for o in list(bpy.data.objects):
    bpy.data.objects.remove(o)
bpy.ops.import_scene.gltf(filepath=GLB)

# repair corner normals that point into the surface (rounded boxes from three.js)
for o in bpy.data.objects:
    if o.type != 'MESH':
        continue
    me = o.data
    ns = [c.vector.copy() for c in me.corner_normals]
    changed = False
    for p in me.polygons:
        for li in p.loop_indices:
            if ns[li].dot(p.normal) < -0.1:
                ns[li] = p.normal.copy(); changed = True
    if changed:
        me.normals_split_custom_set(ns)

def V3(x, y, z):  # three.js (y up) -> blender (z up)
    return Vector((x, -z, y))

Y0 = 0.15
EYE = Y0 + 1.55
sc = bpy.context.scene

# ---------- materials ----------
def nodes(m):
    m.use_nodes = True
    return m.node_tree.nodes, m.node_tree.links

def principled(m):
    for n in m.node_tree.nodes:
        if n.type == 'BSDF_PRINCIPLED':
            return n

def replace(m, build):
    nt, ln = nodes(m)
    out = [n for n in nt if n.type == 'OUTPUT_MATERIAL'][0]
    sh = build(nt, ln)
    ln.new(sh.outputs[0], out.inputs['Surface'])

def glass(nt, ln):
    lp = nt.new('ShaderNodeLightPath')
    g = nt.new('ShaderNodeBsdfGlass'); g.inputs['IOR'].default_value = 1.5; g.inputs['Roughness'].default_value = 0.0
    g.inputs['Color'].default_value = (0.86, 0.93, 0.92, 1)
    t = nt.new('ShaderNodeBsdfTransparent'); t.inputs['Color'].default_value = (0.9, 0.95, 0.94, 1)
    mx = nt.new('ShaderNodeMixShader')
    ln.new(lp.outputs['Is Shadow Ray'], mx.inputs[0]); ln.new(g.outputs[0], mx.inputs[1]); ln.new(t.outputs[0], mx.inputs[2])
    return mx

def emit(strength, color=(1.0, 0.78, 0.5, 1)):
    def b(nt, ln):
        e = nt.new('ShaderNodeEmission'); e.inputs['Color'].default_value = color; e.inputs['Strength'].default_value = strength
        return e
    return b

def fabric_light(alpha, color):
    def b(nt, ln):
        tl = nt.new('ShaderNodeBsdfTranslucent'); tl.inputs['Color'].default_value = color
        df = nt.new('ShaderNodeBsdfDiffuse'); df.inputs['Color'].default_value = color
        t = nt.new('ShaderNodeBsdfTransparent')
        m1 = nt.new('ShaderNodeMixShader'); m1.inputs[0].default_value = 0.5
        ln.new(df.outputs[0], m1.inputs[1]); ln.new(tl.outputs[0], m1.inputs[2])
        m2 = nt.new('ShaderNodeMixShader'); m2.inputs[0].default_value = alpha
        ln.new(t.outputs[0], m2.inputs[1]); ln.new(m1.outputs[0], m2.inputs[2])
        return m2
    return b

def water(nt, ln):
    p = nt.new('ShaderNodeBsdfPrincipled')
    p.inputs['Base Color'].default_value = (0.02, 0.05, 0.07, 1); p.inputs['Roughness'].default_value = 0.04
    tc = nt.new('ShaderNodeTexCoord'); ns = nt.new('ShaderNodeTexNoise'); ns.inputs['Scale'].default_value = 0.6; ns.inputs['Detail'].default_value = 8
    mp = nt.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (1, 4, 1)
    bm = nt.new('ShaderNodeBump'); bm.inputs['Strength'].default_value = 0.15
    ln.new(tc.outputs['Object'], mp.inputs[0]); ln.new(mp.outputs[0], ns.inputs[0]); ln.new(ns.outputs[0], bm.inputs['Height']); ln.new(bm.outputs[0], p.inputs['Normal'])
    return p

def pool(nt, ln):
    p = nt.new('ShaderNodeBsdfPrincipled')
    p.inputs['Base Color'].default_value = (0.55, 0.9, 0.92, 1); p.inputs['Roughness'].default_value = 0.0
    p.inputs['Transmission Weight'].default_value = 1.0; p.inputs['IOR'].default_value = 1.33
    p.inputs['Base Color'].default_value = (0.35, 0.85, 0.88, 1)
    tc = nt.new('ShaderNodeTexCoord'); ns = nt.new('ShaderNodeTexNoise'); ns.inputs['Scale'].default_value = 1.5
    bm = nt.new('ShaderNodeBump'); bm.inputs['Strength'].default_value = 0.08
    ln.new(tc.outputs['Object'], ns.inputs[0]); ln.new(ns.outputs[0], bm.inputs['Height']); ln.new(bm.outputs[0], p.inputs['Normal'])
    lp = nt.new('ShaderNodeLightPath'); t = nt.new('ShaderNodeBsdfTransparent'); t.inputs['Color'].default_value = (0.75, 0.95, 0.95, 1)
    mx = nt.new('ShaderNodeMixShader')
    ln.new(lp.outputs['Is Shadow Ray'], mx.inputs[0]); ln.new(p.outputs[0], mx.inputs[1]); ln.new(t.outputs[0], mx.inputs[2])
    return mx

def img_node(m):
    for n in m.node_tree.nodes:
        if n.type == 'TEX_IMAGE':
            return n

def tint(m, rgb):
    nt, ln = m.node_tree.nodes, m.node_tree.links
    p, im = principled(m), img_node(m)
    if not (p and im): return
    mx = nt.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'; mx.inputs[0].default_value = 1.0
    mx.inputs[7].default_value = (*rgb, 1)
    ln.new(im.outputs['Color'], mx.inputs[6]); ln.new(mx.outputs[2], p.inputs['Base Color'])

def frond(m):
    nt, ln = m.node_tree.nodes, m.node_tree.links
    im = img_node(m)
    out = [n for n in nt if n.type == 'OUTPUT_MATERIAL'][0]
    p = nt.new('ShaderNodeBsdfPrincipled'); p.inputs['Roughness'].default_value = .7
    tr = nt.new('ShaderNodeBsdfTranslucent'); tr.inputs['Color'].default_value = (.18, .3, .05, 1)
    mixl = nt.new('ShaderNodeMixShader'); mixl.inputs[0].default_value = .25
    ln.new(im.outputs['Color'], p.inputs['Base Color']); ln.new(p.outputs[0], mixl.inputs[1]); ln.new(tr.outputs[0], mixl.inputs[2])
    t = nt.new('ShaderNodeBsdfTransparent'); mx = nt.new('ShaderNodeMixShader')
    ln.new(im.outputs['Alpha'], mx.inputs[0]); ln.new(t.outputs[0], mx.inputs[1]); ln.new(mixl.outputs[0], mx.inputs[2])
    ln.new(mx.outputs[0], out.inputs['Surface'])

def haze(m):
    nt, ln = m.node_tree.nodes, m.node_tree.links
    out = [n for n in nt if n.type == 'OUTPUT_MATERIAL'][0]
    p = principled(m)
    e = nt.new('ShaderNodeEmission'); e.inputs['Color'].default_value = (0.78, 0.74, 0.7, 1); e.inputs['Strength'].default_value = 1.0 if not DUSK else 0.12
    mx = nt.new('ShaderNodeMixShader'); mx.inputs[0].default_value = 0.6
    ln.new(p.outputs[0], mx.inputs[1]); ln.new(e.outputs[0], mx.inputs[2]); ln.new(mx.outputs[0], out.inputs['Surface'])

DUSK = 'dusk' in SHOTS
for m in bpy.data.materials:
    if not m.use_nodes:
        continue
    n = m.name
    if n == 'glass':
        replace(m, glass); m.blend_method = 'HASHED' if hasattr(m, 'blend_method') else None
    elif n == 'glow':
        replace(m, emit(25))
    elif n == 'shade':
        replace(m, emit(6, (1.0, 0.82, 0.6, 1)))
    elif n == 'sheer':
        replace(m, fabric_light(0.55, (0.95, 0.94, 0.92, 1)))
    elif n == 'curtain':
        replace(m, fabric_light(0.9, (0.92, 0.89, 0.83, 1)))
    elif n == 'frond':
        frond(m)
    elif n.startswith('tower') or n == 'mountain':
        haze(m)
    elif n in ('sand', 'wetSand'):
        tint(m, (0.74, 0.66, 0.55))
    elif n == 'sea':
        replace(m, water)
    elif n == 'pool':
        replace(m, pool)
    elif n == 'fire':
        replace(m, emit(30, (1.0, 0.5, 0.15, 1)))
    else:
        p = principled(m)
        if p is None:
            continue
        if n in ('marble', 'blackGlass'):
            p.inputs['Coat Weight'].default_value = 0.4
        if n in ('floor', 'oak', 'smoked'):
            p.inputs['Coat Weight'].default_value = 0.15; p.inputs['Coat Roughness'].default_value = 0.25
        if n in ('boucle', 'linen', 'head', 'rust', 'sage', 'rug'):
            p.inputs['Sheen Weight'].default_value = 0.6
        nt2, ln2 = m.node_tree.nodes, m.node_tree.links
        if not p.inputs['Normal'].is_linked and n not in ('rug',):
            bv = nt2.new('ShaderNodeBevel'); bv.inputs['Radius'].default_value = 0.012 if n not in ('stucco', 'slab', 'travertine') else 0.02; bv.samples = 6
            if n in ('stucco', 'sand', 'wetSand', 'travertine', 'concrete', 'plaster', 'boucle', 'linen'):
                tc = nt2.new('ShaderNodeTexCoord'); nz = nt2.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 60 if n not in ('sand', 'wetSand') else 18; nz.inputs['Detail'].default_value = 6
                bm = nt2.new('ShaderNodeBump'); bm.inputs['Strength'].default_value = 0.06 if n not in ('sand', 'wetSand') else 0.25
                ln2.new(tc.outputs['Object'], nz.inputs[0]); ln2.new(nz.outputs[0], bm.inputs['Height']); ln2.new(bv.outputs[0], bm.inputs['Normal']); ln2.new(bm.outputs[0], p.inputs['Normal'])
            else:
                ln2.new(bv.outputs[0], p.inputs['Normal'])
        if n not in ('marble', 'marbleFloor', 'blackGlass', 'bronze', 'brass'):
            # break up perfectly uniform roughness
            tc = nt2.new('ShaderNodeTexCoord'); nz = nt2.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 8
            mr = nt2.new('ShaderNodeMapRange'); base = p.inputs['Roughness'].default_value
            mr.inputs['To Min'].default_value = max(0.02, base - 0.12); mr.inputs['To Max'].default_value = min(1, base + 0.08)
            if not p.inputs['Roughness'].is_linked:
                ln2.new(tc.outputs['Object'], nz.inputs[0]); ln2.new(nz.outputs[0], mr.inputs[0]); ln2.new(mr.outputs[0], p.inputs['Roughness'])

# ---------- world & sun ----------
DUSK = 'dusk' in SHOTS
world = bpy.data.worlds.new('sky'); sc.world = world
nt, ln = nodes(world)
nt.clear()
sky = nt.new('ShaderNodeTexSky'); bg = nt.new('ShaderNodeBackground'); out = nt.new('ShaderNodeOutputWorld')
sky.sky_type = 'MULTIPLE_SCATTERING' if 'MULTIPLE_SCATTERING' in [e.identifier for e in sky.bl_rna.properties['sky_type'].enum_items] else 'NISHITA'
sun_dir = Vector((-0.8, -0.6, 0.0)).normalized()
elev = math.radians(-3.0 if DUSK else 9.0)
sky.sun_disc = True
try: sky.sun_intensity = 0.25
except Exception: pass
sky.sun_elevation = elev
sky.sun_rotation = math.atan2(sun_dir.x, sun_dir.y) * -1 + math.pi
try:
    sky.air_density = 1.0; sky.aerosol_density = 2.5
except Exception:
    try: sky.dust_density = 2.5
    except Exception: pass
bg.inputs['Strength'].default_value = 0.35 if not DUSK else 1.2
ln.new(sky.outputs[0], bg.inputs[0]); ln.new(bg.outputs[0], out.inputs[0])

d = Vector((sun_dir.x * math.cos(elev), sun_dir.y * math.cos(elev), math.sin(elev)))
if not DUSK:
    sun = bpy.data.lights.new('sun', 'SUN'); sun.energy = 4.2; sun.color = (1.0, 0.72, 0.48); sun.angle = math.radians(0.6)
    so = bpy.data.objects.new('sun', sun); sc.collection.objects.link(so)
    so.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()

# ---------- interior lamps ----------
def plight(x, y, z, w, size=0.08, color=(1, 0.75, 0.48)):
    L = bpy.data.lights.new('p', 'POINT'); L.energy = w; L.color = color; L.shadow_soft_size = size
    o = bpy.data.objects.new('p', L); sc.collection.objects.link(o); o.location = V3(x, y, z)
def alight(x, y, z, w, size, color=(1, 0.72, 0.45)):
    A = bpy.data.lights.new('a', 'AREA'); A.energy = w; A.size = size; A.color = color
    o = bpy.data.objects.new('a', A); sc.collection.objects.link(o); o.location = V3(x, y, z)
k = 4 if DUSK else 1
plight(7, Y0 + 3.2, 5.2, 70 * k, .8)
plight(7, Y0 + .9, -3.5, 40 * k, .4, (1, .5, .2))
for x in (-9.3, -8.0, -6.7): plight(x, Y0 + 2.0, 0, 16 * k, .1)
plight(-18.7, Y0 + .86, -5.3, 12 * k, .1); plight(-15.3, Y0 + .86, -5.3, 12 * k, .1)
if DUSK:
    for cx in (-26, -17, -8, 17.5): alight(cx, 4.2, 0, 380, 4)
    alight(7, 5.6, 1, 900, 6)
    for x in (-29, -23, -20, -14, -11, -5, 13.5, 20): plight(x, 2.35, 6.4, 25, .1)

# ---------- cameras ----------
def camera(name, pos, target, lens, shift_y=0.0, level=True, focus=None, fstop=4.0):
    c = bpy.data.cameras.new(name); c.lens = lens; c.sensor_width = 36; c.shift_y = shift_y; c.clip_start = 0.05; c.clip_end = 9000
    if focus:
        c.dof.use_dof = True; c.dof.focus_distance = focus; c.dof.aperture_fstop = fstop
    o = bpy.data.objects.new(name, c); sc.collection.objects.link(o)
    p, t = V3(*pos), V3(*target)
    if level:
        t = Vector((t.x, t.y, p.z))
    o.location = p; o.rotation_euler = (t - p).to_track_quat('-Z', 'Y').to_euler()
    return o

CAMS = {
    'exterior': lambda: camera('exterior', (24, 8, 42), (-5, 2.2, 0), 28, 0.0, level=False),
    'living':   lambda: camera('living', (10.8, 1.6, 7.3), (5.2, 1.6, -4), 18, 0.06, focus=7.0, fstop=3.5),
    'kitchen':  lambda: camera('kitchen', (-5.0, 1.6, 3.8), (-10.2, 1.6, -3), 20, 0.0, focus=5.0, fstop=3.2),
    'bedroom':  lambda: camera('bedroom', (-15.0, 1.5, 2.2), (-17.2, 1.5, -4.6), 18, -0.04, focus=4.8, fstop=3.2),
    'view':     lambda: camera('view', (-6, 2.2, 11.5), (40, 2.2, 30), 26, -0.05, focus=40, fstop=8),
    'dusk':     lambda: camera('dusk', (30, 6, 46), (-5, 3, 0), 30, 0.0, level=False),
}

# ---------- render settings ----------
sc.render.engine = 'CYCLES'
cy = sc.cycles
cy.device = 'CPU'; cy.samples = SAMPLES; cy.use_denoising = True
try: cy.denoiser = 'OPENIMAGEDENOISE'
except Exception: pass
cy.max_bounces = 10; cy.diffuse_bounces = 5; cy.glossy_bounces = 4; cy.adaptive_threshold = 0.015; cy.transmission_bounces = 6; cy.transparent_max_bounces = 12
cy.caustics_reflective = False; cy.caustics_refractive = False
cy.sample_clamp_indirect = 10
sc.render.threads_mode = 'FIXED'; sc.render.threads = os.cpu_count()
sc.render.resolution_x = W; sc.render.resolution_y = H; sc.render.resolution_percentage = 100
sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_depth = '16'
try:
    sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Medium High Contrast'
except Exception:
    pass
EXPO = {'exterior': 0.1, 'living': 0.3, 'kitchen': 0.4, 'bedroom': 0.4, 'view': 0.0, 'dusk': 0.6}

for s in SHOTS:
    cam = CAMS[s]()
    sc.camera = cam
    sc.view_settings.exposure = EXPO[s]
    sc.render.filepath = os.path.join(OUT, f'{s}.png')
    bpy.ops.render.render(write_still=True)
    print('rendered', s, flush=True)
