'use strict'

var
// defaults
consoleLog = false, // set true for metalsmith file and meta content logging
devBuild = ((process.env.NODE_ENV || '').trim().toLowerCase() !== 'production'),
pkg = require('./package.json'),

// main directories
dir = {
  base: __dirname + '/',
  lib: __dirname + '/lib/',
  source: './src/',
  dest: './build/'
},

// template config
templateConfig = {
  engine:     'handlebars',
  directory:  dir.source + 'templates/',
  partials:   dir.source + 'partials/',
  default:    'default.hbt'
},

siteMeta = {
  devBuild: devBuild,
  version:  pkg.version,
  name:     'Vanilla Framework',
  desc:     'A living Pattern Library showcasing Vanilla Framework',
  author:   'Canonical Web Team',
  contact:  'https://twitter.com/craigbuckler',
  domain:    devBuild ? 'http://127.0.0.1' : 'https://rawgit.com', // set domain
  rootpath:  devBuild ? null  : '/sitepoint-editors/metalsmith-demo/master/build/' // set absolute path (null for relative)
},

// modules
gulp = require('gulp'),
rename = require('gulp-rename'),
sass = require('gulp-sass'),
autoprefixer = require('gulp-autoprefixer'),
gutil = require('gulp-util'),
scsslint = require('gulp-scss-lint'),
cssnano = require('gulp-cssnano'),
util = require('util'),
concat = require('gulp-concat'),
browserSync = require('browser-sync').create(),
reload      = browserSync.reload,
ghPages = require('gulp-gh-pages'),
// Metalmsith - pattern library generation
metalsmith = require('metalsmith'),
rootPath = require('metalsmith-rootpath'),
markdown   = require('metalsmith-markdown'),
layouts = require('metalsmith-layouts'),
collections = require('metalsmith-collections'),
permalinks = require('metalsmith-permalinks');

/* Gulp instructions start here */
gulp.task('help', function() {
  console.log('sass - Generate the min and unminified css from sass');
  console.log('develop - Generate Pattern Library and watch assets');
  console.log('build - Generate css');
  console.log('watch - Watch sass files and generate unminified css');
  console.log('test - Lints Sass');
});

// Static server
gulp.task('browser-sync', function() {
    browserSync.init({
        server: {
            baseDir: "./build"
        }
    });

    gulp.watch("./build/**/*.html").on("change", reload);
});

/* Generate Pattern Library with Metalsmith */
gulp.task('pattern-library', function() {
  metalsmith(dir.base)
    .clean(!devBuild) // clean folder before a production build
    .source(dir.source) // source folder (src/)
    .destination(dir.dest) // build folder (build/)
    .use(permalinks({
          pattern: ':collection/:title'
      }))
    .use(rootPath())
    .use(collections({
      settings: { // collection name
        patterns: 'src/vf/settings/*.hbt'
      },
      base: { // collection name
        patterns: 'src/vf/base/*.html'
      },
      // beware possible confusion, we're calling this collection 'patterns' but
      // metalsmith-collections also requires a 'patterns' arg
      patterns: { // collection name
        patterns: 'src/vf/patterns/*.html'
      },
    }))
    .use(markdown()) // convert markdown to html

    .use(layouts(templateConfig)) // layout templating

    .build(function (err) { // build or error log
        if(err) console.log(err)
    })
});

/* Helper functions */
function throwSassError(sassError) {
  throw new gutil.PluginError({
    plugin: 'sass',
    message: util.format(
      "Sass error: '%s' on line %s of %s",
      sassError.message,
      sassError.line,
      sassError.file
    )
  });
}

gulp.task('sasslint', function() {
  var path = (gutil.env.file)? gutil.env.file : '**/*.scss';
  return gulp.src('scss/' + path)
    .pipe(scsslint())
    .pipe(scsslint.failReporter());
});

gulp.task('sass-build', function() {
  return gulp.src('scss/**/*.scss')
    .pipe(sass({
      style: 'expanded',
      errLogToConsole: true,
      onError: throwSassError
    }))
    .pipe(autoprefixer('last 2 version', 'safari 5', 'ie 8', 'ie 9', 'opera 12.1'))
    .pipe(cssnano())
    .pipe(rename({suffix: '.min'}))
    .pipe(gulp.dest('build/css/'));
});

gulp.task('sass-develop', function() {
  return gulp.src(['scss/build.scss', 'scss/pattern-lib.scss'])
    .pipe(sass({ style: 'expanded', errLogToConsole: true }))
    .pipe(autoprefixer('last 2 version', 'safari 5', 'ie 8', 'ie 9', 'opera 12.1'))
    .pipe(gulp.dest('build/css/'))
    .pipe(gulp.dest('demo/css/'))
    .pipe(browserSync.stream());
});

gulp.task('deploy', function() {
  return gulp.src('./build/**/*')
    .pipe(ghPages());
});

gulp.task('watch', function() {
  gulp.watch('scss/**/*.scss', ['sass-develop']);
  gulp.watch(['src/**/*.hbt', 'src/**/*.html', 'src/**/*.md'], ['pattern-library']);
});

gulp.task('develop', ['pattern-library', 'sass-develop', 'watch', 'browser-sync']);

gulp.task('test', ['sasslint']);

gulp.task('build', ['pattern-library', 'sass-build']);

gulp.task('default', ['help']);
