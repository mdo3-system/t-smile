import os

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    public_dir = os.path.join(base_dir, 'public')
    if not os.path.exists(public_dir):
        print("public dir not found")
        return

    for item in os.listdir(public_dir):
        target = os.path.join(base_dir, item)
        source = os.path.join('public', item)
        if not os.path.exists(target):
            try:
                os.symlink(source, target)
                print(f"[LINK] Created symlink: {item} -> {source}")
            except Exception as e:
                print(f"[ERR] Failed to link {item}: {e}")
        else:
            print(f"[OK] Already exists: {item}")

if __name__ == '__main__':
    main()
