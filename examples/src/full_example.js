// Full ol-sld-styler Layer Switcher + Legend demo
//
// Style OpenLayers vector layers using SLD data and embed symbology in a layer
// selector created by third party ol-layer-switcher NPM module. Also create a
// map legend (with show/hide toggle).
//
// The vector tables (and QGIS "layer_styles" SLD XML strings) are first loaded
// from OGC GeoPackages using ol-load-geopackage NPM module, with additional
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
import 'ol-layerswitcher/dist/ol-layerswitcher.css';
import 'ol-sld-styler/dist/ol-sld-styler.css';
import './default.css';

// Module to import OGC GeoPackages
// (import early to start async loading of required sql.js Web Assembly code)
import loadGpkg from 'ol-load-geopackage';

import {createAllLayers, styleLayers, checkForMissingData,
    insertLegend, showLayerSwitcherSymbols} from 'ol-sld-styler';

// All base layer maps/images
import baseLayers from './baselayers_DSC.js';

// Proj4S (if additional coordinate projections required in OpenLayers)
//import proj4 from 'proj4';
//import {register as ol_proj_proj4_register} from 'ol/proj/proj4';

// OpenLayers 6 modules
import ol_control_Control from 'ol/control/Control';
import ol_control_ScaleLine from 'ol/control/ScaleLine';
import ol_interaction_Select from 'ol/interaction/Select';
import {defaults as ol_control_defaults} from 'ol/control';
import ol_Overlay from 'ol/Overlay';
import {get as ol_proj_get} from 'ol/proj';
import ol_Map from 'ol/Map';
import ol_View from 'ol/View';

// Map support modules
import LayerSwitcher from 'ol-layerswitcher';

// Display debug info in the console window
const showDebugInfo = true;

// Check mandatory bits of global map configuration have already been defined
// gpkgFiles: All required QGIS layers (+ layer styles) combined into OGC
// GeoPackages using QGIS Processing > Package Layers
if (typeof mapConfig !== "object") {
    fatalError('Missing global map definition object "mapConfig"');
}
if (!Array.isArray(mapConfig.gpkgFiles)) {
    fatalError('"mapConfig.gpkgFiles" array undefined (Vector layers GeoPackage file list)');
}
if (!Array.isArray(mapConfig.dataLayersConfig)) {
    fatalError('"mapConfig.dataLayersConfig" array undefined (Vector layers configuration)');
}
if (typeof mapConfig.displayProjection !== 'string') {
    fatalError('"mapConfig.displayProjection" string undefined (EPSG map view projection)');
}
if (!Array.isArray(mapConfig.initialMapExtent)) {
    fatalError('"mapConfig.initialMapExtent" array undefined (Initial map bounds)');
}

document.title = mapConfig.pageTitle;

// Make projections defined in proj4 available in OpenLayers.
// (must be done before GeoPackages are loaded)
// Define BNG Projection (parameters from https://epsg.io/27700)
//proj4.defs("EPSG:27700","+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +towgs84=446.448,-125.157,542.06,0.15,0.247,0.842,-20.489 +units=m +no_defs");
//ol_proj_proj4_register(proj4);

// Check if we need to add Proj4s definition for requested display projection
if (!ol_proj_get(mapConfig.displayProjection)) {
    fatalError("Missing requested display projection [" +
        mapConfig.displayProjection + "] - can be added with proj4.defs");
}

// Initiate load of all GeoPackages and standalone SLD files
const sldFilesLoadedPromise = loadAllSldFiles(mapConfig.sldFiles);
const gpkgsLoadedStyledPromise = loadAllGpkgsDoStyling(mapConfig.gpkgFiles,
    mapConfig.sldStylerOptions, sldFilesLoadedPromise);

// Ordered list of OpenLayers data layers/groups
var dataLayerList;

// Layers for which click-selection is enabled
var selectableLayers;

// Parse data layer definitions and create placeholder layers which will be
// updated when actual data has been loaded
try {
    [dataLayerList, selectableLayers] = createAllLayers(
        mapConfig.dataLayersConfig);
} catch (error) {
    fatalError("Problem with mapConfig.dataLayersConfig:\n" + error);
}

// Get final base layer maps/image OpenLayers layer definitions
// (Defined in separate module)
const baseLayerGroup = baseLayers(mapConfig.baseLayerHideAtStartup,
    mapConfig.baseLayerFoldAtStartup);
const layerList = [baseLayerGroup].concat(dataLayerList);


// Create Map canvas and View
const map = new ol_Map({
    controls: ol_control_defaults({
        attributionOptions: {collapsed: false}
    }).extend([new ol_control_ScaleLine()]),
    target: 'map',
    renderer: 'canvas',
    layers: layerList,
    moveTolerance: mapConfig.clickVsMoveTolerance,
    view: new ol_View({
        projection: mapConfig.displayProjection,
        maxZoom: 28,
        minZoom: 1
    })
});
const mapView = map.getView();
mapView.fit(mapConfig.initialMapExtent, map.getSize());

const layerSwitcher = new LayerSwitcher({
    tipLabel: "Layers",
    collapseTipLabel: 'Hide layer control',
    startActive: true,
    activationMode: 'click',
    groupSelectStyle: "group"
});
map.addControl(layerSwitcher);

/**
 * OpenLayers toggle control to show/hide Legend box
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

// After all GeoPackages loaded and associated layers styled
gpkgsLoadedStyledPromise
    .then(() => loadingComplete())
    .catch(error => fatalError(error));

// ---- Selection popup ----

const container = document.getElementById('popup');
const content = document.getElementById('popup-content');
const closer = document.getElementById('popup-closer');

/* Popup JS from OpenLayers examples */

/**
 * Overlay to anchor the feature popup window to the map
 */
const overlayPopup = new ol_Overlay({
    element: container,
    stopEvent: false,
    className: 'popup-overlay',
    autoPan: true,
    autoPanAnimation: {
        duration: 250,
    },
});

// Ensure popup on top of everything to aid viewing on small mobile devices
document.getElementsByClassName('ol-overlaycontainer')[0].style.zIndex = 10;

map.addOverlay(overlayPopup);

/**
 * Add a click handler to hide the popup.
 * @returns {boolean} Don't follow the href.
 */
closer.onclick = function () {
    hidePopup();
    return false;
};

/**
 * Hide feature attributes popup dialog
 */
function hidePopup() {
    overlayPopup.setPosition(undefined);
    closer.blur();
}

// Select interaction working on "singleclick"
const selectSingleClick = new ol_interaction_Select({
    multi: true,
    layers: selectableLayers,
    // TBD: just highlight selected feature(s),
    //      rather than replacing with "edit" style.
    //style: false,
    hitTolerance: mapConfig.selectionHitTolerance
});

map.addInteraction(selectSingleClick);
selectSingleClick.on('select', function (e) {
    const selFeatures = e.target.getFeatures();
    const selCount = selFeatures.getLength();
    if (!selCount) {
        hidePopup();
    } else {
        var popupHTML = '';
        selFeatures.forEach(function(feature) {
            // Use heading from layer
            const layer = selectSingleClick.getLayer(feature);
            const layerProps = layer.getProperties();
            const layerPopupAttr = layerProps.popupAttr;
            popupHTML += '<p class="popup-table-title">' + layerProps.title +
                ':</p><table class="popup-table">';

            // If specific table properties required not defined, display
            // details of ALL properties for each feature
            const featureProps = feature.getProperties();
            if (typeof layerPopupAttr === 'undefined') {
                for (const propName in featureProps) {
                    if (propName !== 'geometry' && propName != 'fid') {
                        popupHTML += popupRowHtml(propName,
                            featureProps[propName]);
                    }
                }

            // Otherwise only show requested properties
            } else {
                for (var attrIx = 0; attrIx < layerPopupAttr.length; attrIx++) {
                    const rowInfo = layerPopupAttr[attrIx];
                    const propName = rowInfo[0];
                    const propValue = featureProps[propName];
                    if (typeof propValue !== 'undefined') {
                        // Use preferred label if specified
                        // (else stick with property name)
                        const attrLabel = rowInfo[1] || propName;
                        popupHTML += popupRowHtml(attrLabel, propValue);
                    } else {
                        console.error('Attribute "' + propName +
                            '" not found in table "' +
                            layerProps.title.replace(/ *<.*> */g, '') + '"');
                    }
                }
            }
            popupHTML += '</table>';
        });

        content.innerHTML = popupHTML;
        const coord = e.mapBrowserEvent.coordinate;
        overlayPopup.setPosition(coord);
    }

    // Generate 1 row of attribute popup table
    function popupRowHtml(label, value) {
        var rowHtml = '';
        if (value) {
            rowHtml = '<tr><td>' + label + '</td><td>' + value + '</td></tr>';
        }
        return rowHtml;
    }
});

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
                        if (showDebugInfo) {
                            console.log('INFO: SLD file loaded: ' + sldFile);
                        }
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

// ---- Extract layer data (& SLD styling info) from OGC GeoPackage files ----

/**
 * Load all OGC GeoPackage files and do layer styling
 * @param {string[]} gpkgFiles - array of GeoPackage data & styling files
 * @param {object} sldStylerOptions - ol-sld-styler configuration
 * @param {Promise} sldFilesLoadedPromise - separate SLD files have been loaded
 * @returns {Promise} all GeoPackages have finished loading and styles applied
 */
function loadAllGpkgsDoStyling(gpkgFiles, sldStylerOptions,
        sldFilesLoadedPromise) {
    var gpkgPromises = [];
    for (let gpkgFile of gpkgFiles) {
        if (showDebugInfo) {
            console.log('INFO: Loading OGC Geopackage: ' + gpkgFile);
        }
        const gpkgPromise = loadGpkg(gpkgFile, mapConfig.displayProjection);
        const gpkgStyledPromise = Promise.all([gpkgPromise, sldFilesLoadedPromise])
            .then(([[dataFromGpkg, sldsFromGpkg], sldsFromFiles]) => {
                const sourceDescription = 'GeoPackage file: ' + gpkgFile;
                styleLayers(mapView, sourceDescription, dataFromGpkg,
                    sldsFromGpkg, sldsFromFiles, sldStylerOptions);

                // For development: display helper template data for all tables
                // and SLDs extracted from each Gpkg
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
        gpkgPromises.push(gpkgStyledPromise);
    }
    return Promise.allSettled(gpkgPromises);

    // For development: display helper template data for all tables in Gpkg
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
}

/**
 * Finishing off once all GeoPackage/SLD file loads and processing complete:
 * final checks and (optionally) add symbols to LayerSwitcher, build legend
 */
function loadingComplete() {
    // Any tables defined in mapConfig.dataLayersConfig still missing?
    // Replace any remaining LayerSwitcher "(Loading...)" placeholders with
    // "(No Data)"
    const tablesMissing = checkForMissingData();
    if (tablesMissing) {
        console.warn('Missing 1 or more source data tables defined in' +
            ' mapConfig.dataLayersConfig');
    }

    // Add symbols to LayerSwitcher
    if (mapConfig.sldStylerOptions.addLayerSwitcherSymbols) {
        const startProcessing = Date.now();
        showLayerSwitcherSymbols(map, LayerSwitcher);
        if (showDebugInfo) {
            const processingSecs = (Date.now() - startProcessing) / 100;
            console.log('INFO: addLayerSwitcherSymbols processing time = ' +
                processingSecs + 's');
        }
    } else {
        // Update layer switcher to remove "Loading..." for loaded layers
        // for simple layerSwitcher without symbology
        layerSwitcher.renderPanel();
    }

    // Build legend
    if (mapConfig.sldStylerOptions.showLegend) {
        const startProcessing = Date.now();

        // Build holder for legend
        buildLegendBox();

        if (showDebugInfo) {
            const processingSecs = (Date.now() - startProcessing) / 1000;
            console.log('INFO: insertLegend processing time = ' +
                processingSecs + 's');
        }
    }
}

/**
 * Basic example of building fixed holder for map legend
 */
function buildLegendBox() {
    const legendBox = document.createElement('div');
    legendBox.className = "legend-box ol-control switched-off";

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
 * Inform user of fatal error then stop everything
 * @param {string} message - error message to display
 */
function fatalError(message) {
    console.error('FATAL error: ' + message);
    alert('FATAL error: ' + message);
    throw 'FATAL error: ' + message;
}
