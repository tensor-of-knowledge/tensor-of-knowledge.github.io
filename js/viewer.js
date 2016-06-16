sc = 1

render = function(w) {
	PDFJS.getDocument({data: w}).then(function(pdfFile) {
		PF = pdfFile;

		openNextPage = function() {
	    	var pageNumber = Math.min(PF.numPages, currPageNumber + 1);
    		if (pageNumber !== currPageNumber) {
		        currPageNumber = pageNumber;
        		openPage(PF, currPageNumber);
    		}
		};

		openPrevPage = function() {
	    	var pageNumber = Math.max(1, currPageNumber - 1);
		    	if (pageNumber !== currPageNumber) {
        		currPageNumber = pageNumber;
        		openPage(PF, currPageNumber);
    		}
		};

		openNextPage();
	});
}

var openPage = function(pdfFile, pageNumber) {
    pdfFile.getPage(pageNumber).then(function(page) {
        viewport = page.getViewport(1);

        var scale = sc * $('#ohfuck').width() / viewport.width;
        viewport = page.getViewport(scale);

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        var renderContext = {
            canvasContext: context,
            viewport: viewport
        };

        page.render(renderContext);
    });
};
