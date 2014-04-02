/**
 * ContentTranslation Server
 *
 * @file
 * @ingroup Extensions
 * @copyright See AUTHORS.txt
 * @license GPL-2.0+
 */

'use strict';

var CXSegmenter = require( __dirname + '/../segmentation/CXSegmenter.js' ).CXSegmenter,
	CXMTInterface = require( __dirname + '/../mt/CXMTInterface.js' ).CXMTInterface,
	logger = require( __dirname + '/../utils/Logger.js' );
/**
 * CXDataModelManager
 * @class
 */
function CXDataModelManager( context ) {
	this.context = context;
	this.dataModel = null;
	this.init();
}

/**
 * Initialize
 */
CXDataModelManager.prototype.init = function () {
	var dataModelManager = this,
		segmenter,
		mtInterface,
		PageLoader, pageloader;

	// TODO: refactor this
	this.context.store.get( this.context.sourcePage, function ( err, data ) {
		dataModelManager.dataModel = JSON.parse( data );
		if ( dataModelManager.dataModel ) {
			// data model present in redis store
			dataModelManager.publish();
		} else {
			PageLoader = require( __dirname + '/../pageloader/PageLoader.js' ).PageLoader;
			pageloader = new PageLoader( dataModelManager.context.sourcePage );
			pageloader.load().then( function ( data ) {
				logger.debug( 'Page fetched' );
				dataModelManager.context.sourceText = data;
				segmenter = new CXSegmenter( dataModelManager.context.sourceText );
				segmenter.segment();
				dataModelManager.dataModel = {
					version: 0,
					sourceLanguage: dataModelManager.context.sourceLanguage,
					targetLanguage: dataModelManager.context.targetLanguage,
					sourcePage: dataModelManager.context.sourcePage,
					segments: segmenter.getSegments(),
					segmentedContent: segmenter.getSegmentedContent(),
					links: segmenter.getLinks()
				};
				dataModelManager.publish();
				// TODO: Dispatch the context to a number of task runners
				// Once each task runners finish, publish.
				mtInterface = new CXMTInterface( dataModelManager.context );
				mtInterface.translate( dataModelManager.dataModel.segments ).then( function ( translations ) {
					dataModelManager.dataModel.mt = translations;
					dataModelManager.publish();
				} );
			}, function () {
				logger.error( 'Error in retrieving the page ' +
					dataModelManager.context.sourcePage );
			} );

		}
	} );
};

/**
 * Publish the data model. Syncs the data with the socket, updates version
 */
CXDataModelManager.prototype.publish = function () {
	var dataModelManager = this,
		data = JSON.stringify( dataModelManager.getDataModel() );

	// TODO: Make the key unique, language pair also should be considered
	// TODO: Make the data model in the redis store more granular than
	// a single json dump.
	this.context.store.set( this.dataModel.sourcePage, data, function () {
		dataModelManager.context.pub.publish( 'cx', data );
	} );
	logger.debug( 'Sending data. Version: ' + this.dataModel.version );
	this.incrementVersionNumber();
};

/**
 * Update the version number of the model
 */
CXDataModelManager.prototype.incrementVersionNumber = function () {
	this.dataModel.version += 1;
};

/**
 * Get the data model
 */
CXDataModelManager.prototype.getDataModel = function () {
	return this.dataModel;
};

module.exports.CXDataModelManager = CXDataModelManager;
