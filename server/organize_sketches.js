const fs = require('fs');
const path = require('path');

const dir = 'e:/Dropbox/■住ま居る/■住ま居る共有/ﾒﾀﾊﾞｰｽ展示場/Antigravity/public/images/kaitai';

const mapping = [
  { src: 'user_sketch_1_824x1024.jpg', dest: 'ch10_roof_insulation.jpg' },
  { src: 'user_sketch_2_1024x764.jpg', dest: 'ch1_living_craft.jpg' },
  { src: 'user_sketch_3_1024x411.jpg', dest: 'ch2_covered_porch.jpg' },
  { src: 'user_sketch_4_764x1024.jpg', dest: 'ch5_ecocarat_bath.jpg' },
  { src: 'user_sketch_5_767x1024.jpg', dest: 'ch3_solid_wood_door.jpg' },
  { src: 'user_sketch_6_764x1024.jpg', dest: 'ch2_stained_glass.jpg' },
  { src: 'user_sketch_7_1024x727.jpg', dest: 'ch8_denim_tatami.jpg' },
  { src: 'user_sketch_8_1024x727.jpg', dest: 'ch2_blue_entrance_screen.jpg' },
  { src: 'user_sketch_9_1024x571.jpg', dest: 'ch6_front_garden_terrace.jpg' },
  { src: 'user_sketch_10_1024x727.jpg', dest: 'ch4_theater_projector.jpg' },
  { src: 'user_sketch_11_764x1024.jpg', dest: 'ch7_bedroom_stained_glass.jpg' },
  { src: 'user_sketch_12_1024x764.jpg', dest: 'ch9_hems_monitor.jpg' },
  { src: 'user_sketch_13_1024x727.jpg', dest: 'ch3_yakusugi_ldk_view.jpg' },
  { src: 'user_sketch_14_1024x571.jpg', dest: 'ch9_solar_house_exterior.jpg' },
  { src: 'user_sketch_15_1024x506.jpg', dest: 'ch4_theater_screen_napoleon.jpg' }
];

mapping.forEach(m => {
  const s = path.join(dir, m.src);
  const d = path.join(dir, m.dest);
  if (fs.existsSync(s)) {
    fs.copyFileSync(s, d);
    console.log(`Copied ${m.src} -> ${m.dest}`);
  } else {
    console.warn(`File not found: ${s}`);
  }
});
