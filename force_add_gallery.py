# -*- coding: utf-8 -*-
with open("public/js/app.js", "r", encoding="utf-8") as f:
    js = f.read()

# Check if caseStudiesData exists
if "caseStudiesData" not in js:
    # Read the gallery code from add_gallery_js.py
    import add_gallery_js
    js += "\n" + add_gallery_js.gallery_code
    with open("public/js/app.js", "w", encoding="utf-8") as out:
        out.write(js)
    print("Successfully appended caseStudiesData and initCaseStudiesGallery to app.js!")
else:
    print("caseStudiesData already exists in app.js.")
