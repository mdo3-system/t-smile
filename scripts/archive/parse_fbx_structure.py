# -*- coding: utf-8 -*-
import struct
import sys
import zlib

sys.stdout.reconfigure(encoding='utf-8')

def parse_fbx_binary(filepath):
    with open(filepath, 'rb') as f:
        magic = f.read(23)
        if not magic.startswith(b'Kaydara FBX Binary'):
            print("Not a binary FBX file")
            return
        version = struct.unpack('<I', f.read(4))[0]
        print(f"FBX File: {filepath}")
        print(f"FBX Version: {version}")

        is_64bit = version >= 7500

        # Read top level nodes
        nodes = []
        while True:
            node = read_node(f, is_64bit)
            if node is None:
                break
            nodes.append(node)
            print(f"Top-level node: {node['name']}, children: {len(node.get('children', []))}")

        # Count Geometry and Model nodes in Objects
        objects_node = next((n for n in nodes if n['name'] == 'Objects'), None)
        if objects_node:
            geoms = []
            models = []
            materials = []
            for child in objects_node.get('children', []):
                name = child['name']
                props = child.get('properties', [])
                if name == 'Geometry':
                    geoms.append(props)
                elif name == 'Model':
                    models.append(props)
                elif name == 'Material':
                    materials.append(props)
            print(f"\n--- Objects Analysis ---")
            print(f"Total Geometries: {len(geoms)}")
            print(f"Total Models: {len(models)}")
            print(f"Total Materials: {len(materials)}")
            print("\nSample Models (first 10):")
            for m in models[:10]:
                print(" ", m)
            print("\nSample Materials (first 10):")
            for mat in materials[:10]:
                print(" ", mat)

def read_node(f, is_64bit):
    if is_64bit:
        header = f.read(25) # 8 + 8 + 8 + 1
        if len(header) < 25:
            return None
        end_offset, num_properties, prop_len, name_len = struct.unpack('<QQQB', header)
    else:
        header = f.read(13) # 4 + 4 + 4 + 1
        if len(header) < 13:
            return None
        end_offset, num_properties, prop_len, name_len = struct.unpack('<IIIB', header)

    if end_offset == 0:
        return None

    name = f.read(name_len).decode('ascii', errors='ignore')

    properties = []
    for _ in range(num_properties):
        prop = read_property(f)
        properties.append(prop)

    children = []
    if f.tell() < end_offset:
        # Has children or padding
        while f.tell() < end_offset:
            # Check for null record (end of block)
            null_record_len = 25 if is_64bit else 13
            curr_pos = f.tell()
            peek = f.read(null_record_len)
            f.seek(curr_pos)
            if all(b == 0 for b in peek):
                # null record marking end
                f.seek(end_offset)
                break
            child = read_node(f, is_64bit)
            if child is None:
                f.seek(end_offset)
                break
            children.append(child)

    return {'name': name, 'properties': properties, 'children': children}

def read_property(f):
    prop_type = f.read(1)
    if not prop_type:
        return None
    pt = prop_type.decode('ascii', errors='ignore')
    if pt == 'Y':
        return struct.unpack('<h', f.read(2))[0]
    elif pt == 'C':
        return bool(struct.unpack('<?', f.read(1))[0])
    elif pt == 'I':
        return struct.unpack('<i', f.read(4))[0]
    elif pt == 'F':
        return struct.unpack('<f', f.read(4))[0]
    elif pt == 'D':
        return struct.unpack('<d', f.read(8))[0]
    elif pt == 'L':
        return struct.unpack('<q', f.read(8))[0]
    elif pt in ('f', 'd', 'l', 'i', 'b'):
        # Array types
        arr_len, enc, comp_len = struct.unpack('<III', f.read(12))
        raw_data = f.read(comp_len)
        return f"[Array {pt} len={arr_len}]"
    elif pt in ('S', 'R'):
        str_len = struct.unpack('<I', f.read(4))[0]
        raw_str = f.read(str_len)
        try:
            return raw_str.decode('utf-8')
        except UnicodeDecodeError:
            try:
                return raw_str.decode('shift-jis')
            except UnicodeDecodeError:
                return raw_str.decode('latin-1', errors='ignore')
    else:
        return f"[Unknown type {pt}]"

if __name__ == '__main__':
    if len(sys.argv) > 1:
        fbx_path = sys.argv[1]
    else:
        fbx_path = r'raw_source_cases/ときがわ町 K様邸/小峯優様邸新築工事.fbx'
    parse_fbx_binary(fbx_path)
