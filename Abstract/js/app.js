var app = angular.module('abstract', []);
app.controller('appCtrl', ['$scope', '$window', function ($scope, $window) {
        $scope.number = 20;
        $scope.result = [];
        for (var i = 0; i < $scope.number; i++) {
            $scope.result[i] = {dum: 'dum'};
        }

        $scope.pages = {};
        $scope.setPages = function () {
            $scope.pages = {
                home: {selected: false},
                about: {selected: false},
                services: {selected: false},
                contact: {selected: false},
                request_service: {selected: false},
                projects: {selected: false},
            }
        }

        $scope.selectPage = function (page) {
            $scope.setPages();
            $scope.pages[page].selected = true;
            if (page == 'home') {
                $("#home_title").typed({
                    strings: ["Abstract"],
                    typeSpeed: 40,
                    cursorChar: "_",
                    callback: function () {
                        $('h1 .typed-cursor').remove();
                        $("#home_body").typed({
                            strings: ["Creating innovative solutions"],
                            typeSpeed: 0,
                            showCursor: true,
                            cursorChar: "_"
                        });
                    },
                });
            } else if (page == 'about') {
                $("#about_p1").typed({
                    strings: ["Abstract is an online web solutions provider based in the middle east area, providing creative and innovative solutions from small personal projects to large big scale systems.<br><br>Abstract team is working effortlessly to come up with suitable structures and strategies for the clients needs based on latest web technologies and design patterns."],
                    typeSpeed: 0,
                    cursorChar: "_",
                    contentType: 'html'
                });
            }

        }
        $scope.selectPage('home');
    }]);