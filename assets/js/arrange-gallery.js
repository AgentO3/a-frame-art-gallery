
AFRAME.registerComponent('arrange-gallery', {
    init: function () {
        let el = this.el
        let artworks = el.querySelectorAll('.artwork')
        let exit = document.getElementById('exit')
        let next = document.getElementById('next')
        let half = Math.ceil(artworks.length / 2)
        let artArray = Array.prototype.slice.call(artworks)
        let leftSide = artArray.splice(0, half)
        let rightSide = artArray.splice(-half)
        let xSpacing = 5
        let d = xSpacing * leftSide.length + 2.5
        exit.setAttribute(
            'position', 
            {x: d, y: 1.5, z: xSpacing / 2})

        if (next) {
            next.setAttribute(
                'position', 
                {x: d, y: 1.5, z: xSpacing / 2 * -1})     
        }

        for (i = 0; i < leftSide.length; i++) {
            leftSide[i].setAttribute('position', 
                                  { x: 5 + i * xSpacing, 
                                    y: 1.5, 
                                    z: -5 })
        }
        for (i = 0; i < rightSide.length; i++) {
            rightSide[i].setAttribute('position', 
                                  { x: 5 + i * xSpacing, 
                                    y: 1.5, 
                                    z: 5 })
            rightSide[i].setAttribute('rotation', '0 -90 0')
        }

    }
});
