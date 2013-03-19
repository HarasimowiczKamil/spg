var ini = require('multilevel-ini');
var template  = require('swig');
var fs = require('node-fs');
var marked = require('marked');
var crypto = require('crypto');

/**
 * Application
 */
var Application = function() {
    // marked fix to use SyntaxHighlighter
    marked.Parser.prototype._tok = marked.Parser.prototype.tok;
    marked.Parser.prototype.tok = function() {
        if (this.token.type === 'code') {
            return this._tok().replace(/(^(\<pre)(>\<code)|(<\/code>)(<\/pre>\n)$)/gm, '$2$5');
        } else {
            return this._tok();
        }
    };
    // init template
    template.init({
        root: appRoot.replace(/\/$/, ''),
        filters: require('./SwigFilters.js')
    })
};

Application.prototype.defaultFileMode = 0664;
Application.prototype.defaultDirMode = 0775;
Application.prototype.regExpExt = /\.([a-zA-Z0-9]+)$/;


Application.prototype.seriesData = {};
Application.prototype.schema = {};
/**
 * @type object - default config
 */
Application.prototype.config = {
    config: './config/config.ini',
    moreTag: '<!-- more -->',
    marked: {
        langPrefix: 'brush: '
    }
};

// EVENTS

Application.prototype.onConfigReady = function() {
    // set config to md
    marked.setOptions(this.config.marked);
    
    // create pages
    for (var page in this.schema) {
        if (typeof page == 'string' && page[0] == '_') {
            log.warn(page, 'is not page');
            continue;
        }
        this.createPage(page, this.schema[page]);
    }
};

// METHODS

/**
 * Create single page
 * 
 * @param string page
 * @param object schema
 */
Application.prototype.createPage = function(page, schema) {
    var self = this,
        fileName = typeof schema.config.fileName == 'undefined' ? page : schema.config.fileName,
        filePath = schema.config.destonationPath,
        templateFile = schema.config.templateFile;

    log.msg('Create page:', page, fileName);
    
    var view = template.compileFile(appRoot + templateFile);
    var params = {
        appRoot: appRoot
    };
    for (var element in schema) {
        if (element === 'config') {
            continue;
        }
        
        if (typeof schema[element] === 'object') {
            params[element] = this.createSeries(element, schema[element], schema.config);
        } else {
            params[element] = schema[element];
        }
        
    }
    params.path = fileName;
    var renderedPage = view.render(params);
    
    fs.mkdirSync(filePath, typeof schema.config.dirMode === 'number' ? schema.config.dirMode : self.defaultDirMode, true);
    log('Save:', filePath + fileName);
    fs.writeFile(
        filePath + fileName,
        renderedPage,
        {
            encoding: 'utf8',
            mode: typeof schema.config.fileMode === 'number' ? schema.config.fileMode : self.defaultFileMode
        },
        function (err) {
            if (err) {
                log.err(err);
                throw err;
            }
        }
    );
};

/**
 * Create series page
 * 
 * @param string name
 * @param object schema
 * @param object config
 * 
 * @returns Array
 */
Application.prototype.createSeries = function(name, schema, config) {
    // simple "cache"
    var hash = crypto.createHash('md5');
    hash.update(schema.sourcePath);
    hash.update(schema.order);
    hash.update(schema.destonationPath);
    hash.update(schema.ext);
    hash.update(schema.templateFile);
    var cacheKey = hash.digest('hex');
    if (typeof this.seriesData[cacheKey] !== 'undefined') {
        return this.seriesData[cacheKey];
    }
    // if not in "cache"
    var self = this;
    log.msg('Create section:', name);
    var seriesList = [];
    log.msg('Finding files in ' + schema.sourcePath + ':');
    var files = this.findFiles(schema.sourcePath, ['md', 'markdown']);
    log.msg('Find', files.length, 'files.');
    
    for (var i = 0; i < files.length; i++) {
        var md = fs.readFileSync(files[i].path, 'utf8');
        if (typeof md === 'string') {
            if (self.config.moreTag) {
                var arrMd = md.split(self.config.moreTag, 2);
                var introduction = marked(arrMd[0]);
            }
            var html = marked(md);
            var seriesData = {
                introText: introduction ? introduction : html,
                fullText: html,
                firstLine: md.match(/^([^\n]+)\n/, '$1')[1],
                sourcePath: files[i].path,
                sourceRelPath: files[i].path.replace(schema.sourcePath, ''),
                atime: files[i].atime,
                mtime: files[i].mtime,
                ctime: files[i].ctime,
                size: files[i].size
            };
            
            if (schema.destonationPath) {
                var view = template.compileFile(schema.templateFile);
                var filePath = seriesData.sourceRelPath;
                // create dir
                fs.mkdirSync((schema.destonationPath + filePath).replace(/\/[^\/]*$/, '/'), typeof config.dirMode === 'number' ? config.dirMode : self.defaultDirMode, true);
                
                // create file
                seriesData.destRelPath = (typeof schema.ext === 'string' ? filePath.replace(self.regExpExt, '.' + schema.ext) : filePath);
                seriesData.destPath = schema.destonationPath + seriesData.destRelPath;
                log('[' + name + ']', 'Save:', seriesData.destPath);
                
                var page = view.render({
                    path: seriesData.destRelPath,
                    name: name,
                    schema: schema,
                    config: config,
                    data: seriesData
                });
                
                fs.writeFile(
                    seriesData.destPath,
                    page,
                    {
                        encoding: 'utf8',
                        mode: typeof config.fileMode === 'number' ? config.fileMode : self.defaultFileMode
                    },
                    function (err) {
                        if (err) {
                            log.err(err);
                            throw err;
                        }
                    }
                );
            }
            seriesList.push(seriesData);
        }
    }
    
    // sorting
    if (schema.order) {
        seriesList = _und.sortBy(seriesList, function(item){
            return item[schema.order];
        });
    }
    
    this.seriesData[cacheKey] = seriesList;
    return seriesList;
};

/**
 * Return all files from path
 * @param {type} path
 * @returns {unresolved}
 */
Application.prototype.findFiles = function(path, onlyExt) {
    if (path[path.length - 1] !== '/') {
        path += '/';
    }
    var self = this,
        files = [],
        list = fs.readdirSync(path);
    
    for (var i = 0; i < list.length; i++) {
        var fileStat = fs.statSync(path + list[i]);
        if (fileStat.isDirectory()) {
            files = files.concat(this.findFiles(path + list[i], onlyExt));
            continue;
        } else {
            var ext = list[i].match(self.regExpExt)[1];
            if (
                (typeof onlyExt === 'undefined') ||
                (typeof onlyExt === 'string' && onlyExt === ext) ||
                (Array.isArray(onlyExt) && ~onlyExt.indexOf(ext))
            ) {
                log.ok(ext, path + list[i]);
                files.push({
                    path: path + list[i],
                    atime: fileStat.atime,
                    mtime: fileStat.mtime,
                    ctime: fileStat.ctime,
                    size: fileStat.size
                });
            } else {
                log.awa(ext, path + list[i]);
            }
        }
    }
    return files;
}

/**
 * run
 * @param Array params
 * @returns {undefined}
 */
Application.prototype.run = function(params) {
    var self = this;
    self.config = _und.extend(this.config, this.prepareParams(params));
    
    ini.get(self.config.config, function(error, result) {
        if (error) {
            log.err('Error load config. (' + self.config.config + ')', error);
            throw error;
            
            return;
        }
        for (var page in result) {
            if (typeof result[page] == 'object') {
                self.schema[page] = result[page];
            } else {
                self.config[page] = result[page];
            }
        }
        self.onConfigReady();
    });
};

/**
 * Prepare parrams array to object
 * @param Array params
 * @returns Object
 */
Application.prototype.prepareParams = function(params) {
    var result = {};
    for (var i = 0; i < params.length; i++) {
        var option = params[i].split('=');
        result[option[0].replace(/^\s*(--)?|\s+$/g, '')] = (typeof option[1] === 'string')
                ? option[1].replace(/^\s+|\s+$/g, '')
                : true;
    }
    return result;
};

module.exports = new Application();