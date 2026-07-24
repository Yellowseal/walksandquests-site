# Screenshots

Drop three iPhone screenshots here, then edit `index.html` — find the `.shot`
divs and replace the placeholder text with an image:

    <div class="shot"><img src="assets/01-map.png" alt="District map"></div>
    <div class="shot"><img src="assets/02-quests.png" alt="Quest list"></div>
    <div class="shot"><img src="assets/03-compass.png" alt="Compass and check-in"></div>

Expected shots, in this order:
  01-map.png       DistrictSelectScreen with the coloured buildings visible
  02-quests.png    a quest list, ideally showing a locked quest with its lock badge
  03-compass.png   the compass mid-walk, or a stop detail with the story open

Notes
- Take them on the largest simulator you have (6.7"/6.9") so they stay sharp when
  scaled down. 1290×2796 or similar is ideal.
- The frames on the page use a 9:19.5 aspect ratio and crop with object-fit:cover,
  so anything close to a modern iPhone ratio will sit correctly.
- Prefer PNG. Keep each file under ~500 KB; run them through an optimiser if needed.
- The same three shots are a reasonable starting point for App Store Connect, but
  Apple requires specific exact sizes there — do not assume these files satisfy it.
