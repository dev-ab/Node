angular.module('MyApp', [
    'appRoutes',
    'mainCtrl',
    'authService',
    'userService',
    'userCtrl',
    'storyService',
    'storyCtrl',
    'reverseDirective',
]).config(function ($httpProvider) {
    $httpProvider.interceptors.push('AuthInterceptor');
})