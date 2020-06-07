AFRAME.registerComponent('image-size', {
    init: function () {
        let el = this.el
        let srcId = el.getAttribute('src')
        let img = document.getElementById(srcId.replace('#', ''))
        let w = img.naturalWidth
        let h = img.naturalHeight
        let ratio = w / h
        let newW = 1
        let newH = newW / ratio
        el.setAttribute('height', newH)
        el.setAttribute('width', newW)
    }
});