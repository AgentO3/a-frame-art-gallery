# A-Frame Art Gallery

A VR art gallery template that uses Jekyll to generate the gallery for easy hosting on Github pages. The goal is to make it very easy for artists to create VR art galleries to showcase their work online. 

Example here

https://agento3.github.io/a-frame-art-gallery/

## Gallery Overview

Adding artwork to your gallery is very easy. You just need to understand these three folders and add the right files. Then just push to github and github pages will do the rest. The result is a freely hosted website that contains your VR gallery of interconncted rooms filled with your artwork.

`_rooms` - This is a space in a gallery that contains your artwork. Each room can have a unique look. Currently we are using the [aframe-environment-component](https://github.com/supermedium/aframe-environment-component). However you can do anything you want. 

`_artworks` - The markdown files in this folder represent a specific art piece. Currently this is limited to just images but the plan is to expand into other elements. 

To add add artwork you only need to add markdown files to the _artwork folder and then add your images to the assets folder. 