---
layout: rooms
---
<a-entity environment="preset: dream"></a-entity>
<a-entity
    arrange>
    {% assign rooms = site.rooms %}
    {% for room in rooms %}
    <a-box
     class="link" 
     rotation="0 90 0"
     link="href: {{ '/' | relative_url }}rooms/{{ room.title | downcase | replace: ' ', '-' }}; 
     title:{{ room.title }};"
     color="brown" depth="2" height="2.5" width="0.05">
     <a-text 
     align="center"
     position="0 1.8 0"
     rotation="0 -90 0"
     value="{{ room.title }}"></a-text>
    </a-box>
    {% endfor %}
</a-entity>