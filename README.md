[![Gitpod ready-to-code](https://img.shields.io/badge/Gitpod-ready--to--code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/AgentO3/a-frame-art-gallery)

# A-Frame Art Gallery

A VR art gallery template that uses Jekyll to generate the gallery for easy hosting on Github pages. The goal is to make it very easy for artists to create VR art galleries to showcase their work online. 

Example here

https://agento3.github.io/a-frame-art-gallery/

## Gallery Overview

Adding artwork to your gallery is very easy. You just need to understand these three folders and add the right files. Then just push to github and github pages will do the rest. The result is a freely hosted website that contains your VR gallery of interconnected rooms filled with your artwork.

`_rooms` - This is a space in a gallery that contains your artwork. Each room can have a unique look. Currently we are using the [aframe-environment-component](https://github.com/supermedium/aframe-environment-component). However you can do anything you want. 

`_artworks` - The markdown files in this folder represent a specific art piece. Currently this is limited to just images but the plan is to expand into other elements. In addition to the details about the art piece it also defines what room this art piece will appear in.

`assets` - This is where you put images of your art pieces. 

## Navigating the Gallery

On a laptop use the directional arrows to move around the gallery. To move to the next room walk towards the door. One you collide with the door you'll be brought to the next room. 

## Adding Rooms and Artwork

### Adding Rooms

Before you can add artwork you must define a room first. Inside the `_rooms` folder you will find files `markdown` files that have these contents.

```
---
title: Color
---
{% include gallery.html %}
<a-entity environment="preset: contact"></a-entity>

```

`title` - Is what the room will be called. You'll need to reference this in your artwork files.

`<a-entity environment="preset: contact"></a-entity>` - Defines the environment of that room. You can change the value of present to change the room's look. You can find the [possible presets here](https://github.com/supermedium/aframe-environment-component#parameters).

### Adding Art

Once your `_rooms` are defined you can start adding artwork to the `_artworks` folder. Here is an example of the artworks file.

```---
image: my-artwork.jpg
title:  This Is My Art's Title
created: 2020
artist: FirstName LastName
room: Color
link: https://somedomain.com/link/to/something
---

A more in depth description of the art piece.

```
- `image:` - The name of the image. This files needs to be in the `assets/artwork` folder. 
- `title:` - The title of the art piece.
- `room:` - The name of the room this art piece will appear in.
- `link` - If you want to link this piece to something on external web page. 
- `below the ---` - Description of the art piece. 








