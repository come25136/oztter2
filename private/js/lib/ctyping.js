(function ($) {
  $.fn.ctyping = function (value, min, max, cb) {
    return this.each(function () {
      var $this = $(this);
      var values = value.toString().split("");
      var count = 0;

      function add() {
        $this.val($this.val() + values[count]);
        count++;

        if (count !== values.length) {
          setTimeout(add, Math.floor(Math.random() * (++max - min)) + min);
        } else {
          cb();
        }
      }

      setTimeout(add, Math.floor(Math.random() * (++max - min)) + min);
    });
  };
})(jQuery);