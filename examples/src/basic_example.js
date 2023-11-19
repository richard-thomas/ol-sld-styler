// ol-sld-styler basic layer styling demo
//
// Style OpenLayers vector layers using SLD data.
//
// The vector tables (and QGIS "layer_styles" SLD XML strings) are first loaded
// from an OGC GeoPackage using ol-load-geopackage NPM module.
//
// (A separate "mapConfig" object providing layer templating information must
//  be defined before this file is loaded)

// ESLint settings:
/* eslint no-unused-vars: 1 */
/* global mapConfig */

import 'ol/ol.css';
import 'ol-sld-styler/dist/ol-sld-styler.css';
import './default.css';

// Module to import OGC GeoPackages
// (import early to start async loading of required sql.js Web Assembly code)
import loadGpkg from 'ol-load-geopackage';

import {createAllLayers, styleLayers, checkForMissingData} from 'ol-sld-styler';

// OpenLayers 6 modules
import {get as ol_proj_get} from 'ol/proj';
import ol_Map from 'ol/Map';
import ol_View from 'ol/View';
import ol_layer_Tile from 'ol/layer/Tile';
import ol_source_XYZ from 'ol/source/XYZ';

// Check if we need to add Proj4s definition for requested display projection
if (!ol_proj_get(mapConfig.displayProjection)) {
    fatalError("Missing requested display projection [" +
        mapConfig.displayProjection + "] - can be added with proj4.defs");
}

// Initiate load of OGC GeoPackage
const gpkgFile = mapConfig.gpkgFile;
const gpkgPromise = loadGpkg(gpkgFile, mapConfig.displayProjection);

// When all loaded (and data extracted) do all OpenLayers layer styling
const gpkgStyledPromise = gpkgPromise
    .then(([dataFromGpkg, sldsFromGpkg]) => {
        // Not loading any separate SLD files
        const sldsFromFiles = {};

        const sourceDescription = 'GeoPackage file: ' + gpkgFile;
        styleLayers(mapView, sourceDescription, dataFromGpkg,
            sldsFromGpkg, sldsFromFiles, mapConfig.sldStylerOptions);

        // For development: display helper template data for all tables
        // extracted from the OGC GeoPackage file
        if (mapConfig.debugShowTableJson) {
            debugShowTableJson(gpkgFile, dataFromGpkg);
        }
        // For development: display SLDs extracted from "layer_styles" table
        // in QGIS-exported OGC GeoPackage file
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
    source: new ol_source_XYZ({
        url: 'https://tiles.stadiamaps.com/tiles/stamen_toner_lite/{z}/{x}/{y}@2x.png',
        attributions: [
        '&copy; <a href="https://stadiamaps.com/" target="_blank">Stadia Maps</a>',
        '&copy; <a href="https://stamen.com/" target="_blank">Stamen Design</a>',  // Required for Stamen styles
        '&copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a>',
        '&copy; <a href="https://www.openstreetmap.org/about/" target="_blank">OpenStreetMap contributors</a>'
        ]
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

// Final checks after all GeoPackages loaded and associated layers styled
gpkgStyledPromise
    .then(() => {
        // Any tables defined in mapConfig.dataLayersConfig still missing?
        checkForMissingData();
    })
    .catch(error => fatalError(error));

//-----------------------------------------------------------------------------
// Function definitions only from here
//-----------------------------------------------------------------------------

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
            "\ttable: '" + table + "'\n" +
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
