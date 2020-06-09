
AFRAME.registerComponent('link-collide', {
    init: function () {
        console.log("loaded")
        let el = document.querySelector('a-scene')
        el.addEventListener('hitstart', function (event) {
            let link = event.target.getAttribute('link')
            window.location.href = link.href;
        });
    }
});
