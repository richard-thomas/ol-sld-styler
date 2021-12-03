// ol-sld-styler Legend demo
//
// Style OpenLayers vector layers using SLD data and generate a map legend.
//
// The vector tables (and QGIS "layer_styles" SLD XML strings) are first loaded
// from an OGC GeoPackage using ol-load-geopackage NPM module, with additional
// individual SLD files also loaded.
//
// (A separate "mapConfig" object providing layer templating information must
//  be defined before this file is loaded)

// ESLint settings:
/* eslint no-unused-vars: 1 */
/* global mapConfig */

import '@fortawesome/fontawesome-free/css/fontawesome.css';
import '@fortawesome/fontawesome-free/css/solid.css';
import 'ol/ol.css';
import 'ol-sld-styler/dist/ol-sld-styler.css';
import './default.css';

// Module to import OGC GeoPackages
// (import early to start async loading of required sql.js Web Assembly code)
import loadGpkg from 'ol-load-geopackage';

import {createAllLayers, styleLayers, checkForMissingData,
    insertLegend} from 'ol-sld-styler';

// OpenLayers 6 modules
import ol_control_Control from 'ol/control/Control';
import {get as ol_proj_get} from 'ol/proj';
import ol_Map from 'ol/Map';
import ol_View from 'ol/View';
import ol_layer_Tile from 'ol/layer/Tile';
import ol_source_Stamen from 'ol/source/Stamen';

// Check if we need to add Proj4s definition for requested display projection
if (!ol_proj_get(mapConfig.displayProjection)) {
    fatalError("Missing requested display projection [" +
        mapConfig.displayProjection + "] - can be added with proj4.defs");
}

// Initiate load of all OGC GeoPackages and standalone SLD files
const sldFilesLoadedPromise = loadAllSldFiles(mapConfig.sldFiles);
const gpkgFile = mapConfig.gpkgFile;
const gpkgPromise = loadGpkg(gpkgFile, mapConfig.displayProjection);

// When all loaded (and data extracted) do all OpenLayers layer styling
const gpkgStyledPromise = Promise.all([gpkgPromise, sldFilesLoadedPromise])
    .then(([[dataFromGpkg, sldsFromGpkg], sldsFromFiles]) => {
        const sourceDescription = 'GeoPackage file: ' + gpkgFile;
        styleLayers(mapView, sourceDescription, dataFromGpkg,
            sldsFromGpkg, sldsFromFiles, mapConfig.sldStylerOptions);

        // For development: display helper template data for all tables
        // and SLDs extracted from each OGC GeoPackage file
        if (mapConfig.debugShowTableJson) {
            debugShowTableJson(gpkgFile, dataFromGpkg);
        }
        if (mapConfig.debugShowSLD) {
            console.log('DEBUG: Raw SLD XML for each layer in' +
                ' GeoPackage "' + gpkgFile + '":');
            console.log(sldsFromGpkg);
        }
    })
    // Flag fatal error to user
    // (but code will actually limp on with missing layers marked)
    .catch(error => fatalError(error));

// Ordered list of OpenLayers data layers/groups
var dataLayerList;

// Layers for which click-selection is enabled (not used in this example)
var selectableLayers;

// Parse data layer definitions and create placeholder layers which will be
// updated when actual data has been loaded
try {
    [dataLayerList, selectableLayers] = createAllLayers(
        mapConfig.dataLayersConfig);
} catch (error) {
    fatalError("Problem with mapConfig.dataLayersConfig:\n" + error);
}

// Define a base layer raster map
const lyrStamenTonerLite = new ol_layer_Tile({
    title: 'Stamen Toner Lite',
    properties: {'type': 'base' },
    opacity: 0.35,
    source: new ol_source_Stamen({
        layer: 'toner-lite'
    })
});

// Create Map canvas and View
const map = new ol_Map({
    target: 'map',
    renderer: 'canvas',
    layers: [lyrStamenTonerLite].concat(dataLayerList),
    view: new ol_View({
        projection: mapConfig.displayProjection,
        maxZoom: 28,
        minZoom: 1
    })
});
const mapView = map.getView();
mapView.fit(mapConfig.initialMapExtent, map.getSize());

// After all GeoPackages loaded and associated layers styled
// final checks and build legend
gpkgStyledPromise
    .then(() => {
        // Any tables defined in mapConfig.dataLayersConfig still missing?
        checkForMissingData();

        // Build legend
        if (mapConfig.sldStylerOptions.showLegend) {
            buildLegendBox();
        }
    })
    .catch(error => fatalError(error));

/**
 * Example OpenLayers toggle control to show/hide Legend box
 */
class legendToggleControl extends ol_control_Control {
    /**
     * @param {Object} [opt_options] Control options.
     */
    constructor(opt_options) {
        const options = opt_options || {};

        const button = document.createElement('button');
        button.title = 'Legend show/hide';
        button.className += ' fa fa-list-alt';

        const element = document.createElement('div');
        element.className = 'legend-toggle ol-unselectable ol-control';
        element.appendChild(button);

        super({
            element: element,
            target: options.target,
        });

        button.addEventListener('click', this.toggleLegend.bind(this), false);
    }

    // Button click handler (turns Legend on/off)
    toggleLegend() {
        const legend = document.getElementsByClassName('legend-box')[0];
        legend.classList.toggle('switched-off');
    }
}
map.addControl(new legendToggleControl);

//-----------------------------------------------------------------------------
// Function definitions only from here
//-----------------------------------------------------------------------------

/**
 * Load list of SLD files
 * @param {string[]} sldFiles - array of (overriding) SLD styling files
 * @returns {Promise} object of SLD XML strings (key = layer name)
 */
function loadAllSldFiles(sldFiles) {
    var sldPromises = [];
    var sldsFromFiles = {};

    for (let sldFile of sldFiles) {
        const sldPromise = loadSld(sldFile)
            .then(sldText => processSldFileData(sldFile, sldText))
            // Flag fatal error to user
            // (but code will actually limp on with missing styles marked)
            .catch(error => fatalError(error));
        sldPromises.push(sldPromise);
    }
    return Promise.allSettled(sldPromises)
        .then( () => sldsFromFiles);

    // Load a single SLD file
    // Returns Promise, then an SLD text string on successful completion
    function loadSld(sldFile) {
        return new Promise(function(succeed, fail) {
            const oReq = new XMLHttpRequest();
            oReq.onreadystatechange = function() {

                // When request finished and response is ready
                if (this.readyState == 4) {
                    const sldText = this.responseText;
                    if (this.status === 200 && sldText) {
                        succeed(sldText);
                    } else {
                        fail(new Error('Requested SLD file could not be loaded: ' +
                            sldFile));
                    }
                }
            };
            oReq.open("GET", sldFile);
            oReq.send();
        });
    }

    // Store SLD XML text string in sldsFromFiles object indexed by its filename
    // with folder path and .sld suffix stripped off
    function processSldFileData(sldFile, sldText) {
        const sldFileName = sldFile.replace(/^.*[\\/]/, '')
            .replace(/\.(sld|SLD)$/, '');
        sldsFromFiles[sldFileName] = sldText;
    }
}

/**
 * Basic example of building fixed holder for map legend
 */
function buildLegendBox() {
    const legendBox = document.createElement('div');
    legendBox.className = "legend-box ol-control";

    const legendTitle = document.createElement('div');
    legendTitle.className = "legend-title";
    legendTitle.innerHTML = "Legend";
    legendBox.appendChild(legendTitle);

    const controlsContainer = map.getControls().getArray()[0].element.parentNode;
    controlsContainer.appendChild(legendBox);

    // sldStyler insertLegend: construct legend and add to end of legendBox
    insertLegend(map, legendBox);
}

/**
 * For development: display helper template data for all tables in GeoPackage
 * @param {string} gpkgFile - URL of loaded OGC GeoPackage
 * @param {object} dataFromGpkg - OpenLayers vector sources, key = table name
 */
 function debugShowTableJson(gpkgFile, dataFromGpkg) {
    var debugTables =
        'DEBUG: Feature tables as JSON template for dataLayersConfig array' +
        ' (in mapConfig) as extracted from "' +
        gpkgFile + '":\n';
    for (const table in dataFromGpkg) {
        // Template data for each table + its properties (except geometry)
        const properties = dataFromGpkg[table].getFeatures()[0]
            .getProperties();
        delete properties.geometry;
        debugTables +="{\n" +
            "\ttable: '" + table + "',\n" +
            "\tpopupAttr: [" +
            Object.keys(properties).map(p => `['${p}']`).join(', ') +
            "]\n" +
            "},\n";
    }
    console.log(debugTables);
}

/**
 * Inform user of fatal error then stop everything
 * @param {string} message - error message to display
 */
function fatalError(message) {
    console.error('FATAL error: ' + message);
    alert('FATAL error: ' + message);
    throw 'FATAL error: ' + message;
}
