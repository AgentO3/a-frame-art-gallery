---
title: Rock Bands
---
<ul>
  {% assign filtered_rooms = site.artworks | where: 'room', page.title %}
  {% for artwork in filtered_rooms %}
    <li>{{ artwork.title }}</li>
  {% endfor %}
</ul>