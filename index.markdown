---
layout: rooms
---
<a-entity environment="preset: forest"></a-entity>
<a-entity
    arrange>
    {% assign rooms = site.rooms %}
    {% for room in rooms %}
    <a-link 
        class="door"
        href="{{ '/' | relative_url }}rooms/{{ room.title | downcase | replace: ' ', '-' }}"
        title="{{ room.title }}"></a-link>
    {% endfor %}
</a-entity>
<a-entity 
    cursor="rayOrigin: mouse"
    camera 
    position="0 1.6 0" 
    wasd-controls 
    rotation
    look-controls>
</a-entity>