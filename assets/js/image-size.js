AFRAME.registerComponent('image-size', {
    init: function () {
        let el = this.el
        let src = el.getAttribute('src')
        let img = document.getElementById(src.replace('#', ''))
        let w = img.naturalWidth
        let h = img.naturalHeight
        let ratio = w / h
        let expectedW = 1
        let expectedH = expectedW / ratio
        el.setAttribute('height', expectedH)
        el.setAttribute('width', expectedW)
    }
});