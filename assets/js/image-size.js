AFRAME.registerComponent('image-size', {
    init: function () {
        let el = this.el
        let srcId = el.getAttribute('src')
        let img = document.getElementById(srcId.replace('#', ''))
        let frame = el.querySelector('.frame')
        img.onload = function () {
            let w = img.naturalWidth
            let h = img.naturalHeight
            let ratio = w / h
            let newW = 1
            let newH = newW / ratio
            let padding = 0.25
            el.setAttribute('height', newH)
            el.setAttribute('width', newW)
            if (frame) {
                frame.setAttribute('height', newH + padding)
                frame.setAttribute('depth', newW + padding)
            }
        }
    }
});