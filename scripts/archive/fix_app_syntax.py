# -*- coding: utf-8 -*-
with open('public/js/app.js', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. fix unclosed svg1F string
bad_svg = 'svg1F: `<svg viewBox="0 0 800 600" width="100%" height="100%"><rect width="800" height="600" fill="#f8fafc" \n          })\n        });'
good_svg = 'svg1F: `<svg viewBox="0 0 800 600" width="100%" height="100%"><rect width="800" height="600" fill="#f8fafc"/></svg>`\n          })\n        });'

text = text.replace(bad_svg, good_svg)

# 2. fix missing closing bracket for loadAdminPlansData
bad_admin_end = """    console.error('[Admin Plans Load Error]', err);
  }
// """
good_admin_end = """    console.error('[Admin Plans Load Error]', err);
  }
}

// """

text = text.replace(bad_admin_end, good_admin_end)

with open('public/js/app.js', 'w', encoding='utf-8') as f:
    f.write(text)

print("Saved public/js/app.js")
