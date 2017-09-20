function start(name) {
    var
        $progressbar = $('#progressbar'),
        $welcome = $('#welcome'),
        welcome_count = 6,
        size = 12,
        density = 26,
        canvas = document.querySelector('#progress'),
        ctx = canvas.getContext('2d'),
        particles = [],
        c = "abcdefghijklmnopqrstuvwxyz0123456789";

    ctx.globalAlpha = 0.9;

    function particle(scale, color, speed) {
        this.scale = scale;
        this.color = color;
        this.speed = speed;
        this.position = {
            x: null,
            y: null
        };
    }

    particle.prototype.draw = function () {
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.scale, 0, 20 / 2 * Math.PI, false);
        ctx.fillStyle = this.color;
        ctx.fill();
    };

    for (var i = 0; i < density; i++) {
        make(i);
    }

    loop();

    function loop() {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        for (var i = 0; i < density; i++) {
            particles[i].position.y -= particles[i].speed;
            particles[i].draw();

            if (particles[i].position.y <= 0 - particles[i].scale) {
                particles.splice(i--, 1);
                make(Object.keys(particles).length++);
            }
        }

        setTimeout(loop, 1000 / 60);
    }

    function make(i) {
        var scale = Math.random() * (size - 3) + 3;

        particles[i] = new particle(scale, '#ffffff', scale / 5);
        particles[i].position.x = Math.random() * canvas.width;
        particles[i].position.y = canvas.height + 5 + Math.random() * canvas.height;
        particles[i].draw();
    }

    setTimeout(function () {
        $('#b').ctyping(name, 50, 90, function () {
            var pass = "";
            for (var i = 0; i < 26; i++) {
                pass += c[Math.floor(Math.random() * c.length)];
            }

            $('#c').ctyping(pass, 10, 100, function () {
                $('.a').hide();
                $progressbar.show();

                $('#progress-t').css('width', '0px');
                setTimeout(function () {
                    $progressbar.fadeOut(500);
                    $progressbar.hide(welcome);

                    $('body').fadeOut(8000, function () {
                        window.location.href = "/";
                    });

                    function welcome() {
                        $welcome.fadeIn(1500).fadeOut(90, welcome);
                    }
                }, 5300);
            });
        });
    }, 4000);
};
