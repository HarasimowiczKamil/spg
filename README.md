Spg - Static Page Generator
===========================

Simple generator static pages. To generate use swig templates and markdown files to create content. Spg allows you to define multiple pages and a series from specified directory. Only what you need is other web server (like apache or nginx), define templates in swig and configuration ini file.

Install
-------

```
npm install -g spg
```

Tutorial
--------

You must create dirs, config file, md files with content and templates.
```
mkdir my-test-page
cd my-test-page
mkdir articles
mkdir public
mkdir view
touch config.ini
```
Edit config.ini and define pages:
```ini
[_global]
config.destonationPath = public/ ; path wher new file was create
config.fileName = index.html ; file name

[index : _global] ; inherits the settings from the section _global
config.templateFile = view/index.html ; template file for site "index"
config.fileName = index.html ; file name
; define for series pages
articles.sourcePath = articles/ ; path where searh md files
articles.order = path ; order files by
articles.destonationPath = public/articles/ ; destonation generated files
articles.ext = html ; change md extension for html
articles.templateFile = view/article.html ; template file

[history : index] ; inherits the settings from the section index
config.templateFile = view/history.html ; change template name
config.fileName = history.html ; change destonation file name

[about : _global]
config.templateFile = view/about.html
config.fileName = about.html
```

Create templates in `view` dir [http://paularmstrong.github.com/swig/docs/](How to create templates files)
If you want use article's list in template, you must write something like this:

```html
{% for art in articles %}
<div>
    {{ art.introText|raw }}
</div>
<div>
    <ul class="nav nav-pills">
        <li><a href="/articles/{{ art.destRelPath }}" title="{{ art.firstLine|title }}">Czytaj więcej</a></li>
        <li><a href="/articles/{{ art.destRelPath }}#disqus_thread" title="{{ art.firstLine|title }}">Komentuj</a></li>
    </ul>
</div>
{% endfor %}
```

Article atributes:

```js
art = {
    fullText: /* html file generated from md */
    introText: /* html file generated from md to tag <!-- more --> */
    firstLine: /* first line from md */
    sourcePath: /* path to md file */
    sourceRelPath: /* relative path to file */,
    destPath: /* destonation path to html file */
    destRelPath: /* relative path to html file (can be use to create links) */
    size: /* size md file */
    atime: /* data from fs.statSync */
    mtime: /* data from fs.statSync */
    ctime: /* data from fs.statSync */
}
```

In `view/article.html` template use variable `data`

```js
{% block content %}
    {{ data.fullText|raw }}
{% endblock %}
```

Ok you have config and templates. Create yours .md pages in `articles/` dir and run commend:

```
spg --config=config.ini
```
In "public" should appear html files.

Configure your webserwer and is done.

Help
----

Create a issue if something is not clear.