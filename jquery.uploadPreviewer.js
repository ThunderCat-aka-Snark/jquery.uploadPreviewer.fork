(function ($) {
    defaults = {
        linkToken: "1",
        formDataKey: "files",
        buttonText: "Add Files",
        buttonClass: "file-preview-button",
        shadowClass: "file-preview-shadow",
        tableCss: "file-show-table",
        alertMaxFiles:'',
        alertMaxSize:'',
        alertMaxFileSize:'',
        tableRowClass: "file-preview-row",
        placeholderClass: "file-preview-placeholder",
        loadingCss: "file-preview-loading",
        maxFilesAllow: 10, // 15 files total
        maxFileSizeAllow: 1048576*10, // 10 mb per image
        maxTotalSizeAllow: 1048576*10, // 10 mb total
        tableTemplate: function () {
            return "<table class='table table-striped file-preview-table' id='file-preview-table'>" +
                "<tbody></tbody>" +
                "</table>";
        },
        rowTemplate: function(options) {
            return "<tr class='" + config.tableRowClass + "'>" +
                "<td>" +"<input type='radio' name='main' value='"+options.name+"' title='сделать главной'>"+
                "<img src='" + options.src + "' class='" + options.placeholderCssClass + "' data-src='"+options.name+"'/>" + "</td>" +
                "<img src='" + options.src + "' class='fullsize' data-size='"+options.size+"' style='display:none'/>" +
                    /*
                     "<td class='filename'>" + options.name + "</td>" +
                     "<td class='filesize'>" + options.size + "</td>" +
                     */
                "<td class='remove-file'><div class='btn btn-danger removeimage'>&times;</div></td>" +
                "</tr>";
        },
        loadingTemplate: function () {
            return "<div id='file-preview-loading-container' style='display: none'>" +
                "<div id='" + config.loadingCss + "' class='loader-inner ball-clip-rotate-pulse no-show'>" +
                "<div></div>" +
                "<div></div>" +
                "</div>" +
                "</div>";
        }
    }

    //NOTE: Depends on Humanize-plus (humanize.js)
    if (typeof Humanize == 'undefined' || typeof Humanize.filesize != 'function') {
        $.getScript("/js/humanize.min.js")
    }

    var getFileSize = function (filesize) {
        //return Humanize.fileSize(filesize);
        return filesize;
    };

    // NOTE: Ensure a required filetype is matching a MIME type
    // (partial match is fine) and not matching against file extensions.
    //
    // Quick ref:  http://www.sitepoint.com/web-foundations/mime-types-complete-list/
    //
    // NOTE: For extended support of mime types, we should use https://github.com/broofa/node-mime
    var getFileTypeCssClass = function (filetype) {
        var fileTypeCssClass;
        fileTypeCssClass = (function () {
            switch (true) {
                case /video/.test(filetype):
                    return 'video';
                case /audio/.test(filetype):
                    return 'audio';
                case /pdf/.test(filetype):
                    return 'pdf';
                case /csv|excel/.test(filetype):
                    return 'spreadsheet';
                case /powerpoint/.test(filetype):
                    return 'powerpoint';
                case /msword|text/.test(filetype):
                    return 'document';
                case /zip/.test(filetype):
                    return 'zip';
                case /rar/.test(filetype):
                    return 'rar';
                default:
                    return 'default-filetype';
            }
        })();
        return defaults.placeholderClass + " " + fileTypeCssClass;
    };

    $.fn.uploadPreviewer = function (options, callback) {
        var that = this;

        if (!options) {
            options = {};
        }
        config = $.extend({}, defaults, options);
        var buttonText,
            previewRowTemplate,
            previewTable,
            previewTableBody,
            alertMaxFiles,
            alertMaxSize,
            alertMaxFileSize,
            maxFilesAllow, // 10 files total
            maxFileSizeAllow, // 8 mb per image
            maxTotalSizeAllow, // 20 mb total
            totalFiles = 0, // 10 files total
            totalFileSize = 0, // 8 mb per image
            totalSize = config.maxTotalSizeAllow, // 20 mb total
            previewTableIdentifier,
            currentFileList = [];

        if (window.File && window.FileReader && window.FileList && window.Blob) {

            $(document).on('click', '.file-preview-shadow',function(){
                $('#image').click();
            })
            /*this.wrap("<span class='btn btn-primary " + config.shadowClass + "'></span>");
            buttonText = this.parent("." + config.shadowClass);
            buttonText.prepend("<span>" + config.buttonText + "</span>");
            buttonText.wrap("<span class='" + config.buttonClass + "'></span>");*/

            previewTableIdentifier = options.preview_table;
            if (!previewTableIdentifier) {
                $("span." + config.buttonClass).after(config.tableTemplate());
                previewTableIdentifier = "table." + config.tableCss;
            }

            previewTable = $(previewTableIdentifier);
            previewTable.addClass(config.tableCss);
            previewTableBody = previewTable.find("tbody");

            previewRowTemplate = options.preview_row_template || config.rowTemplate;

            previewTable.after(config.loadingTemplate());

            /*previewTable.on("click", ".removeimage", function () {
                console.log(currentFileList);
                console.log(currentFileList);
                var parentRow = $(this).parent("tr");
                var filename = $(this).parent().find('input').val();
                for (var i = 0; i < currentFileList.length; i++) {
                    if (currentFileList[i].name == filename) {
                        console.log('totalSize:',totalSize);
                        if(totalSize > currentFileList[i].size)totalSize -= currentFileList[i].size;
                        else totalSize = 0;
                        if(totalFiles > 0)totalFiles--;
                        else totalFiles = 0;
                        currentFileList.splice(i, 1);
                        console.log('list after rem:',currentFileList);
                        break;
                    }
                }
                parentRow.remove();
                $.event.trigger({type: 'file-preview:changed', files: currentFileList});
            });*/

            this.on('change', function (e) {
                var loadingSpinner = $("#" + config.loadingCss);
                loadingSpinner.show();
                var reader;
                var filesCount = e.currentTarget.files.length;
                console.log('in fileselect:',filesCount);
                console.log('already have:',totalFiles);
                console.log('max allow:',config.maxFilesAllow);
                if((filesCount) > config.maxFilesAllow){
                    alert(config.alertMaxFiles);
                    e.currentTarget.value = '';
                    return;
                }else{
                    totalFiles += filesCount;
                }
                $.each(e.currentTarget.files, function (index, file) {
                    var filesize, filetype, imagePreviewRow, placeholderCssClass, source;
                    filesize = getFileSize(file.size);
                    if(filesize > config.maxTotalSizeAllow){
                        alert(config.alertMaxFileSize);
                        e.currentTarget.value = '';
                        return;
                    }
                    if((totalSize + file.size) > config.maxTotalSizeAllow){
                        alert(config.alertMaxSize);
                        e.currentTarget.value = '';
                        return;
                    }
                    if (previewTableBody) {
                        reader = new FileReader();
                        reader.onload = function (fileReaderEvent){
                            source = fileReaderEvent.target.result;
                            //console.log(fileReaderEvent.target.result);
                            //console.log(fileReaderEvent.target);
                            console.log($('[data-src="'+file.name+'"]'));
                            $('[data-src="'+file.name+'"]')[0].src = fileReaderEvent.target.result;
                            $('[data-src="'+file.name+'"]').data('src','');
                        };
                        if (!(file && file.type.match('image.*'))) {
                            console.log(file);
                            return;
                        }
                        reader.readAsDataURL(file);
                        filetype = file.type;
                        if (/image/.test(filetype)) {
                            source = "/images/spinner.gif";
                            placeholderCssClass = config.placeholderClass + " image";
                        } else {
                            source = "";
                            placeholderCssClass = getFileTypeCssClass(filetype);
                        }

                        totalSize = file.size  + totalSize;
                        config.maxFilesAllow --;
                        imagePreviewRow = previewRowTemplate({
                            src: source,
                            name: file.name,
                            placeholderCssClass: placeholderCssClass,
                            size: filesize
                        });
                        previewTableBody.append(imagePreviewRow);
                        currentFileList.push(file);
                    }
                    if (callback) {
                        callback(fileReaderEvent);
                    }

                });
                e.currentTarget.value = '';
                $.event.trigger({type: 'file-preview:changed', files: currentFileList});
            });

            this.fileList = function () {
                return currentFileList;
            }

            this.clearFileList = function () {
                $('.remove-file').click();
            }

            this.url = function (url) {
                if (url != undefined) {
                    config.url = url;
                } else {
                    return config.url;
                }
            }

            this._onComplete = function (eventData) {
                eventData['type'] = 'file-preview:submit:complete'
                $.event.trigger(eventData);
            }

            this.setMain = function(main){
                options.main = main;
            }
            this.minusImage = function(size){
                console.log('now allow more size',totalSize);
                totalSize -= size;
                config.maxFilesAllow++;
                console.log('now allow more files',config.maxFilesAllow);
                console.log('now allow more size',totalSize);
            }

            this.submit = function (successCallback, errorCallback) {
                if (config.url == undefined) throw('Please set the URL to which I shall post the files');
                if (currentFileList.length > 0) {
                    var filesFormData = new FormData();
                    currentFileList.forEach(function (file) {
                        filesFormData.append(options.formDataKey + "[]", file);
                    });
                    filesFormData.append('linktoken', options.linkToken);
                    filesFormData.append('main', options.main);
                    filesFormData.append('ansid', options.ansid);
                    console.log('main',options.main);
                    $.ajax({
                        type: "POST",
                        url: config.url,
                        data: filesFormData,
                        contentType: false,
                        processData: false,
                        xhr: function () {
                            var xhr = new window.XMLHttpRequest();
                            xhr.upload.addEventListener("progress", function (evt) {
                                if (evt.lengthComputable &&
                                    options != null &&
                                    options.uploadProgress != null
                                    && typeof options.uploadProgress == "function") {
                                    options.uploadProgress(evt.loaded / evt.total);
                                }
                            }, false);
                            return xhr;
                        },
                        success: function (data, status, jqXHR) {
                            if (typeof successCallback == "function") {
                                successCallback(data, status, jqXHR);
                            }
                            that._onComplete({data: data, status: status, jqXHR: jqXHR});
                        },
                        error: function (jqXHR, status, error) {
                            if (typeof errorCallback == "function") {
                                errorCallback(jqXHR, status, error);
                            }
                            that._onComplete({error: error, status: status, jqXHR: jqXHR});
                        }
                    });
                } else {
                    console.log("There are no selected files, please select at least one file before submitting.");
                    that._onComplete({status: 'no-files'});
                }
            }

            return this;

        } else {
            throw "The File APIs are not fully supported in this browser.";
        }
    };
})(jQuery);
