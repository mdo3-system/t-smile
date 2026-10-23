# -*- coding: utf-8 -*-
"""
scripts/inspect_kitchen_counter.py
キッチンカウンター周辺（X: -250〜-80, Y: 0〜240, Z: 50〜250）のメッシュを特定する。
カウンターの天板、シンク、コンロ、および壁の有無を完全把握する。
"""
import sys
import numpy as np
from find_fbx_ceiling_mesh import parse_geometry_vertices

sys.stdout.reconfigure(encoding='utf-8')

# We can re-use the geometries from find_fbx_ceiling_mesh
import struct
import zlib

def inspect_kitchen(filepath):
    with open(filepath, 'rb') as f:
        magic = f.read(23)
        version = struct.unpack('<I', f.read(4))[0]
        is_64bit = version >= 7500

        def read_node_header():
            if is_64bit:
                header = f.read(25)
                if len(header) < 25: return None
                end_offset, num_properties, prop_len, name_len = struct.unpack('<QQQB', header)
            else:
                header = f.read(13)
                if len(header) < 13: return None
                end_offset, num_properties, prop_len, name_len = struct.unpack('<IIIB', header)
            if end_offset == 0: return None
            name = f.read(name_len).decode('ascii', errors='ignore')
            return end_offset, num_properties, prop_len, name

        while True:
            res = read_node_header()
            if res is None: break
            end_offset, num_props, prop_len, name = res
            if name == 'Objects':
                parse_kitchen_objects(f, end_offset, is_64bit)
                break
            else:
                f.seek(end_offset)

def parse_kitchen_objects(f, objects_end, is_64bit):
    geometries = []
    null_len = 25 if is_64bit else 13

    while f.tell() < objects_end:
        pos = f.tell()
        peek = f.read(null_len)
        f.seek(pos)
        if all(b == 0 for b in peek):
            f.seek(null_len, 1)
            continue

        if is_64bit:
            header = f.read(25)
            if len(header) < 25: break
            end_offset, num_props, prop_len, name_len = struct.unpack('<QQQB', header)
        else:
            header = f.read(13)
            if len(header) < 13: break
            end_offset, num_props, prop_len, name_len = struct.unpack('<IIIB', header)

        if end_offset == 0: break
        name = f.read(name_len).decode('ascii', errors='ignore')

        if name == 'Geometry':
            # Skip props to find Vertices
            for _ in range(num_props):
                pt = f.read(1).decode('ascii', errors='ignore')
                if pt in ('Y', 'C'): f.seek(1 if pt == 'C' else 2, 1)
                elif pt in ('I', 'F'): f.seek(4, 1)
                elif pt in ('D', 'L'): f.seek(8, 1)
                elif pt in ('f', 'd', 'l', 'i', 'b'):
                    arr_len, enc, comp_len = struct.unpack('<III', f.read(12))
                    f.seek(comp_len, 1)
                elif pt in ('S', 'R'):
                    slen = struct.unpack('<I', f.read(4))[0]
                    f.seek(slen, 1)
                else: break

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
                    pt = f.read(1).decode('ascii', errors='ignore')
                    if pt == 'd':
                        arr_len, enc, comp_len = struct.unpack('<III', f.read(12))
                        raw_data = f.read(comp_len)
                        if enc == 1: raw_data = zlib.decompress(raw_data)
                        verts = np.frombuffer(raw_data, dtype='<f8')
                        vert_count = len(verts) // 3
                        if vert_count > 0:
                            v3 = verts.reshape(-1, 3)
                            bbox = (v3.min(axis=0), v3.max(axis=0))
                    f.seek(s_end)
                else:
                    f.seek(s_end)
            if bbox is not None:
                geometries.append({
                    'min': bbox[0], 'max': bbox[1],
                    'size': bbox[1] - bbox[0],
                    'center': (bbox[0] + bbox[1]) / 2.0
                })
        else:
            f.seek(end_offset)

    # Three.js offset
    b_min = np.array([-591.66, -1.97, -872.15])
    b_center = np.array([0.0, 169.47, 0.0])

    for g in geometries:
        g['tc'] = g['center'] - np.array([b_center[0], b_min[1], b_center[2]])
        g['ts'] = g['size']

    # Find kitchen counter (around X: -250 to -100, Y: 50 to 120, Z: 100 to 220)
    counter_parts = [g for g in geometries if -250 <= g['tc'][0] <= -80 and 50 <= g['tc'][1] <= 120 and 100 <= g['tc'][2] <= 240]
    print(f"Total Kitchen Counter Parts: {len(counter_parts)}")
    counter_parts.sort(key=lambda g: g['ts'][0] * g['ts'][2], reverse=True)
    for i, g in enumerate(counter_parts[:10]):
        tc = g['tc']
        ts = g['ts']
        print(f"  [{i+1}] Center: [X:{tc[0]:.1f}, Y:{tc[1]:.1f}, Z:{tc[2]:.1f}] | Size: [W:{ts[0]:.1f}, H:{ts[1]:.1f}, D:{ts[2]:.1f}]")

    # Check if there is ANY vertical wall mesh at the left edge of counter
    # Left edge of counter would be around X: -100 to -160, Z: 180 to 240, Y: 0 to 240
    walls = [g for g in geometries if -180 <= g['tc'][0] <= -90 and 170 <= g['tc'][2] <= 240 and g['ts'][1] > 150]
    print(f"\nVertical Wall Meshes on Left of Kitchen (Height > 150): {len(walls)}")
    for i, g in enumerate(walls):
        tc = g['tc']
        ts = g['ts']
        print(f"  Wall [{i+1}] Center: [X:{tc[0]:.1f}, Y:{tc[1]:.1f}, Z:{tc[2]:.1f}] | Size: [W:{ts[0]:.1f}, H:{ts[1]:.1f}, D:{ts[2]:.1f}]")

if __name__ == '__main__':
    fbx_path = r"raw_source_cases\ときがわ町 K様邸\小峯優様邸新築工事.fbx"
    inspect_kitchen(fbx_path)
