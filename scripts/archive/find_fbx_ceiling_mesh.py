# -*- coding: utf-8 -*-
"""
scripts/find_fbx_ceiling_mesh.py
FBXバイナリ（Ver 7500）から全Geometryの頂点（Vertices）を解凍・展開し、
各メッシュの3Dバウンディングボックスを特定する。
吹抜（Void）を塞いでいる水平天井板メッシュおよびキッチンカウンター周辺のメッシュを完全特定する。
"""
import struct
import sys
import zlib
import numpy as np

sys.stdout.reconfigure(encoding='utf-8')

def parse_geometry_vertices(filepath):
    with open(filepath, 'rb') as f:
        magic = f.read(23)
        version = struct.unpack('<I', f.read(4))[0]
        is_64bit = version >= 7500

        # We will iterate through Objects -> Geometry
        # To be fast, let's parse nodes
        def read_node_header():
            if is_64bit:
                header = f.read(25)
                if len(header) < 25:
                    return None
                end_offset, num_properties, prop_len, name_len = struct.unpack('<QQQB', header)
            else:
                header = f.read(13)
                if len(header) < 13:
                    return None
                end_offset, num_properties, prop_len, name_len = struct.unpack('<IIIB', header)
            if end_offset == 0:
                return None
            name = f.read(name_len).decode('ascii', errors='ignore')
            return end_offset, num_properties, prop_len, name

        def skip_properties(num_props):
            props = []
            for _ in range(num_props):
                pt = f.read(1).decode('ascii', errors='ignore')
                if pt == 'Y':
                    f.seek(2, 1)
                elif pt == 'C':
                    f.seek(1, 1)
                elif pt == 'I':
                    props.append(struct.unpack('<i', f.read(4))[0])
                elif pt == 'F':
                    props.append(struct.unpack('<f', f.read(4))[0])
                elif pt == 'D':
                    props.append(struct.unpack('<d', f.read(8))[0])
                elif pt == 'L':
                    props.append(struct.unpack('<q', f.read(8))[0])
                elif pt in ('f', 'd', 'l', 'i', 'b'):
                    arr_len, enc, comp_len = struct.unpack('<III', f.read(12))
                    f.seek(comp_len, 1)
                elif pt in ('S', 'R'):
                    slen = struct.unpack('<I', f.read(4))[0]
                    sdata = f.read(slen)
                    props.append(sdata.decode('utf-8', errors='ignore'))
                else:
                    break
            return props

        # Search for Objects node
        while True:
            res = read_node_header()
            if res is None:
                break
            end_offset, num_props, prop_len, name = res
            if name == 'Objects':
                print(f"Found Objects node, scanning geometries...")
                parse_objects(f, end_offset, is_64bit)
                break
            else:
                f.seek(end_offset)

def parse_objects(f, objects_end, is_64bit):
    geometries = [] # (geom_id, geom_name, bbox)
    models = {} # model_id -> (name, type)
    connections = [] # will be read if needed

    while f.tell() < objects_end:
        # Check null record
        pos = f.tell()
        null_len = 25 if is_64bit else 13
        peek = f.read(null_len)
        f.seek(pos)
        if all(b == 0 for b in peek):
            f.seek(null_len, 1)
            continue

        if is_64bit:
            header = f.read(25)
            if len(header) < 25:
                break
            end_offset, num_props, prop_len, name_len = struct.unpack('<QQQB', header)
        else:
            header = f.read(13)
            if len(header) < 13:
                break
            end_offset, num_props, prop_len, name_len = struct.unpack('<IIIB', header)

        if end_offset == 0:
            break

        name = f.read(name_len).decode('ascii', errors='ignore')

        if name == 'Geometry':
            # Read properties of Geometry
            geom_props = read_geom_properties(f, num_props)
            geom_id = geom_props[0] if len(geom_props) > 0 else 0
            geom_name = geom_props[1] if len(geom_props) > 1 else ""

            # Now find Vertices subnode
            bbox = None
            vert_count = 0
            while f.tell() < end_offset:
                sub_pos = f.tell()
                peek = f.read(null_len)
                f.seek(sub_pos)
                if all(b == 0 for b in peek):
                    f.seek(null_len, 1)
                    continue

                if is_64bit:
                    sub_h = f.read(25)
                    if len(sub_h) < 25: break
                    s_end, s_nprop, s_plen, s_nlen = struct.unpack('<QQQB', sub_h)
                else:
                    sub_h = f.read(13)
                    if len(sub_h) < 13: break
                    s_end, s_nprop, s_plen, s_nlen = struct.unpack('<IIIB', sub_h)

                if s_end == 0: break
                s_name = f.read(s_nlen).decode('ascii', errors='ignore')

                if s_name == 'Vertices':
                    # Read Vertices array property
                    pt = f.read(1).decode('ascii', errors='ignore')
                    if pt == 'd':
                        arr_len, enc, comp_len = struct.unpack('<III', f.read(12))
                        raw_data = f.read(comp_len)
                        if enc == 1:
                            raw_data = zlib.decompress(raw_data)
                        verts = np.frombuffer(raw_data, dtype='<f8')
                        vert_count = len(verts) // 3
                        if vert_count > 0:
                            v3 = verts.reshape(-1, 3)
                            min_pt = v3.min(axis=0)
                            max_pt = v3.max(axis=0)
                            bbox = (min_pt, max_pt)
                    f.seek(s_end)
                else:
                    f.seek(s_end)

            if bbox is not None:
                geometries.append({
                    'id': geom_id,
                    'name': geom_name,
                    'vert_count': vert_count,
                    'min': bbox[0],
                    'max': bbox[1],
                    'size': bbox[1] - bbox[0],
                    'center': (bbox[0] + bbox[1]) / 2.0
                })
        else:
            f.seek(end_offset)

    print(f"\nSuccessfully extracted {len(geometries)} geometry bounding boxes!")

    # Overall building bbox
    all_min = np.min([g['min'] for g in geometries], axis=0)
    all_max = np.max([g['max'] for g in geometries], axis=0)
    print(f"Total Building Raw Bounds:")
    print(f"  Min: X={all_min[0]:.1f}, Y={all_min[1]:.1f}, Z={all_min[2]:.1f}")
    print(f"  Max: X={all_max[0]:.1f}, Y={all_max[1]:.1f}, Z={all_max[2]:.1f}")
    print(f"  Size: W={all_max[0]-all_min[0]:.1f}, H={all_max[1]-all_min[1]:.1f}, D={all_max[2]-all_min[2]:.1f}")

    # Three.js coordinate system mapping:
    # In Three.js:
    # buildingBox excludes huge grounds (size.y < 35 and (size.x > 1200 or size.z > 1200))
    building_geoms = [g for g in geometries if not (g['size'][1] < 35 and (g['size'][0] > 1200 or g['size'][2] > 1200))]
    b_min = np.min([g['min'] for g in building_geoms], axis=0)
    b_max = np.max([g['max'] for g in building_geoms], axis=0)
    b_center = (b_min + b_max) / 2.0
    print(f"\nFiltered Building Bounds (matching Three.js):")
    print(f"  Min: {b_min}")
    print(f"  Max: {b_max}")
    print(f"  Center: {b_center}")

    # Now calculate Three.js world coordinates for each mesh:
    # child.position in Three.js = raw - [b_center.x, b_min.y, b_center.z]
    for g in geometries:
        g['t_center'] = g['center'] - np.array([b_center[0], b_min[1], b_center[2]])
        g['t_size'] = g['size']

    # Filter for ceiling/floor candidates around Y = 220 to 280
    # and in LDK area (X: -200 to 200, Z: 50 to 250)
    ceiling_candidates = []
    for g in geometries:
        tc = g['t_center']
        ts = g['t_size']
        if ts[1] < 35 and 210 <= tc[1] <= 290:
            ceiling_candidates.append(g)

    print(f"\n--- Ceiling / Floor Plate Meshes at Y=210..290 (Total: {len(ceiling_candidates)}) ---")
    # Sort by area (size.x * size.z)
    ceiling_candidates.sort(key=lambda g: g['t_size'][0] * g['t_size'][2], reverse=True)
    for i, g in enumerate(ceiling_candidates[:25]):
        tc = g['t_center']
        ts = g['t_size']
        print(f"  [{i+1}] ID:{g['id']} Name:{g['name'][:20]} | Center: [X:{tc[0]:.1f}, Y:{tc[1]:.1f}, Z:{tc[2]:.1f}] | Size: [W:{ts[0]:.1f}, H:{ts[1]:.1f}, D:{ts[2]:.1f}] | Verts:{g['vert_count']}")

def read_geom_properties(f, num_props):
    props = []
    for _ in range(num_props):
        pt = f.read(1).decode('ascii', errors='ignore')
        if pt == 'Y':
            props.append(struct.unpack('<h', f.read(2))[0])
        elif pt == 'C':
            props.append(bool(struct.unpack('<?', f.read(1))[0]))
        elif pt == 'I':
            props.append(struct.unpack('<i', f.read(4))[0])
        elif pt == 'F':
            props.append(struct.unpack('<f', f.read(4))[0])
        elif pt == 'D':
            props.append(struct.unpack('<d', f.read(8))[0])
        elif pt == 'L':
            props.append(struct.unpack('<q', f.read(8))[0])
        elif pt in ('f', 'd', 'l', 'i', 'b'):
            arr_len, enc, comp_len = struct.unpack('<III', f.read(12))
            f.seek(comp_len, 1)
        elif pt in ('S', 'R'):
            slen = struct.unpack('<I', f.read(4))[0]
            sdata = f.read(slen)
            try:
                props.append(sdata.decode('utf-8'))
            except Exception:
                props.append(sdata.decode('latin-1', errors='ignore'))
        else:
            break
    return props

if __name__ == '__main__':
    fbx_path = r"raw_source_cases\ときがわ町 K様邸\小峯優様邸新築工事.fbx"
    parse_geometry_vertices(fbx_path)
