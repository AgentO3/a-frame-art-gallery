
AFRAME.registerComponent('arrange', {
    init: function () {
        let el = this.el
        let doors = el.querySelectorAll(".door")
        let x_spacing = 5
        for (i = 0; i < doors.length; i++) {
            doors[i].setAttribute('position', 
                                  { x: -5 + i * x_spacing, 
                                    y: 1.5, 
                                    z: -5 })
        }
    }
});
