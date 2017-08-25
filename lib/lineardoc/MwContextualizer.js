'use strict';

var contentBranchNodeNames,
	util = require( 'util' ),
	Contextualizer = require( './Contextualizer' );

contentBranchNodeNames = [ 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'pre' ];

/**
 * Contextualizer for MediaWiki DOM HTML
 *
 * See https://www.mediawiki.org/wiki/Specs/HTML
 *
 * @class
 * @extends Contextualizer
 * @constructor
 */
function MwContextualizer() {
	this.contexts = [];
}

util.inherits( MwContextualizer, Contextualizer );

/**
 * @inheritdoc
 */
MwContextualizer.prototype.getChildContext = function ( tag ) {
	var context = this.getContext(),
		type = tag.attributes.typeof || tag.attributes.rel || '';

	// Any descendent of Transclusion/Placeholder is verbatim
	if ( context === 'verbatim' || type.match( /(^|\s)(mw:Transclusion|mw:Placeholder)\b/ ) ) {
		return 'verbatim';
	}

	// Otherwise, figure is media
	if ( context === undefined && tag.name === 'figure' ) {
		return 'media';
	}

	// And figure//figcaption is contentBranch
	if ( context === 'media' && tag.name === 'figcaption' ) {
		return 'contentBranch';
	}

	// And ContentBranchNodes are contentBranch
	if ( context === undefined && contentBranchNodeNames.indexOf( tag.name ) > -1 ) {
		return 'contentBranch';
	}

	// Else same as parent context
	return context;
};

/**
 * @inheritdoc
 */
MwContextualizer.prototype.canSegment = function () {
	return this.getContext() === 'contentBranch';
};

module.exports = MwContextualizer;
