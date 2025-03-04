
let websocket: WebSocket = null,
    uuid: string = null,
    registerEventName: string = null,
    actionInfo: InActionInfo = {} as InActionInfo, // TODO: Fix
    inInfo: InInfo = {} as InInfo, // TODO: Fix
    runningApps = [], // TODO: Type Defs
    isQT: boolean = navigator.appVersion.includes('QtWebEngine');

function connectElgatoStreamDeckSocket(
    inPort: string,
    inUUID: string,
    inRegisterEvent: string,
    inInfoStr: string,
    inActionInfo: string
): void {
    // TODO: Note: I changed the inInfo param to inInfoStr to preserve sanity
    uuid = inUUID;
    registerEventName = inRegisterEvent;
    console.log(inUUID, inActionInfo);
    actionInfo = JSON.parse(inActionInfo);
    inInfo = JSON.parse(inInfoStr);
    websocket = new WebSocket(`ws://127.0.0.1:${inPort}`);

    addDynamicStyles(inInfo.colors);

    websocket.onopen = websocketOnOpen;
    websocket.onmessage = websocketOnMessage;

    // Allow others to get notified that the websocket is created
    const event = new Event('websocketCreate');
    document.dispatchEvent(event);

    loadConfiguration(actionInfo.payload.settings);
}

function websocketOnOpen(): void {
    const json = {
        event: registerEventName,
        uuid: uuid
    };
    websocket.send(JSON.stringify(json));

    // Notify the plugin that we are connected
    sendValueToPlugin("property_inspector", "propertyInspectorConnected");
}

function websocketOnMessage(evt: MessageEvent): void {
    const jsonObj = JSON.parse(evt.data);

    if(jsonObj.event === 'sendToPropertyInspector' || jsonObj.event === 'didReceiveSettings'){
        const payload = jsonObj.payload;
        loadConfiguration(payload);
    } else {
        console.error(`Unhandled websocketOnMessage: ${jsonObj.event}`);
    }
}

function loadConfiguration(payload: {[key: string]: any}): void {

    for(const key in payload){
        try {
            const elem: unknown = document.getElementById(key);
            if(isCheckbox(elem)){
                elem.checked = payload[key];
            }
            else if(isFile(elem)){
                const elemFile: HTMLElement = document.getElementById(`${elem.id}Filename`);
                elemFile.innerText = payload[key];
                if(!elemFile.innerText){
                    elemFile.innerText = "No file...";
                }
            }
            else if(isList(elem)){
                const textProperty = elem.getAttribute("sdListTextProperty");
                const valueProperty = elem.getAttribute("sdListValueProperty");
                const valueField = elem.getAttribute("sdValueField");

                const items = payload[key];
                elem.options.length = 0;

                for(let i=0, len=items.length;i<len;i++){
                    const opt: HTMLOptionElement = document.createElement('option');
                    opt.value = items[i][valueProperty];
                    opt.text = items[i][textProperty];
                    elem.appendChild(opt);
                }
                elem.value = payload[valueField];
            }
            else if(isHTML(elem)){
                elem.innerHTML = payload[key];
            }
            else {
                (elem as {value: any}).value = payload[key]; // TODO: dafuq is this? Dirty type overload
            }
            console.log(`Load: ${key} = ${payload[key]}`);
        } catch(err){
            console.error(`loadConfiguration failed for key: ${key} - ${err}`);
        }
    }
}

function setSettings(): void {
    let payload: {[key: string]: any} = {};
    const elements: unknown[] = [...document.getElementsByClassName("sdProperty")];

    for(const elem of elements){
        const key = (elem as HTMLElement).id;

        if(isCheckbox(elem)){
            payload[key] = elem.checked;
        }
        else if(isFile(elem)){
            const elemFile = document.getElementById(`${elem.id}Filename`);
            payload[key] = elem.value;
            if(!elem.value){
                // Fetch innerText if file is empty (happens when we lose and regain focus to this key)
                payload[key] = elemFile.innerText;
            } else {
                elemFile.innerText = elem.value;
            }
        }
        else if(isList(elem)){
            const valueField = elem.getAttribute("sdValueField");
            payload[valueField] = elem.value;
        }
        else if(isHTML(elem)){
            const valueField = elem.getAttribute("sdValueField");
            payload[valueField] = elem.innerHTML;
        }
        else {
            payload[key] = (elem as {value: any}).value; // TODO: Reeee
        }
        console.log(`Save: ${key} <= ${payload[key]}`);
    }
    setSettingsToPlugin(payload);
}

function setSettingsToPlugin(payload: {[key: string]: any}): void {
    if(websocket?.readyState === 1){
        const json = {
            "event": "setSettings",
            "context": uuid,
            "payload": payload
        };
        websocket.send(JSON.stringify(json));
        const event = new Event('settingsUpdated');
        document.dispatchEvent(event);
    }
}

// Sends an entire payload to the sendToPlugin method
function sendPayloadToPlugin(payload: {[key: string]: any}): void {
    if(websocket?.readyState === 1){
        const json = {
            "action": actionInfo['action'],
            "event": "sendToPlugin",
            "context": uuid,
            "payload": payload
        };
        websocket.send(JSON.stringify(json));
    }
}

// Sends one value to the sendToPlugin method
function sendValueToPlugin(param: any, value: any): void {
    if(websocket?.readyState === 1){
        const json = {
            "action": actionInfo['action'],
            "event": "sendToPlugin",
            "context": uuid,
            "payload": {
                [param]: value
            }
        };
        websocket.send(JSON.stringify(json));
    }
}

function openWebsite(): void {
    if(websocket?.readyState === 1){
        const json = {
            "event": "openUrl",
            "payload": {
                "url": "https://BarRaider.github.io"
            }
        };
        websocket.send(JSON.stringify(json));
    }
}

if(!isQT){
    document.addEventListener("DOMContentLoaded", initPropertyInspector);
}

window.addEventListener("beforeUnload", (e: BeforeUnloadEvent) => {
    e.preventDefault();

    // Notify the plugin we are about to leave
    sendValueToPlugin("property_inspector", "propertyInspectorWillDisappear");

    // Don't set a returnValue to the event, otherwise Chromium with throw an error.
});

function initPropertyInspector(): void {
    // Place to add functions
}

function addDynamicStyles(clrs: any): void {
    // TODO: Is node ID supposed to contain a hash symbol?
    const node = document.getElementById('#sdpi-dynamic-styles') || document.createElement('style');
    if(!clrs.mouseDownColor) clrs.mouseDownColor = fadeColor(clrs.highlightColor, -100);
    const clr = clrs.highlightColor.slice(0, 7);
    const clr1: string = fadeColor(clr, 100);
    const clr2: string = fadeColor(clr, 60);
    const metersActiveColor: string = fadeColor(clr, -60);

    node.setAttribute('id', 'sdpi-dynamic-styles');

    // TODO: Note, this adds a bunch of white space to the left of this string.
    node.innerHTML = `
    input[type="radio"]:checked + label span,
    input[type="checkbox"]:checked + label span {
        background-color: ${clrs.highlightColor};
    }

    input[type="radio"]:active:checked + label span,
    input[type="radio"]:active + label span,
    input[type="checkbox"]:active:checked + label span,
    input[type="checkbox"]:active + label span {
      background-color: ${clrs.mouseDownColor};
    }

    input[type="radio"]:active + label span,
    input[type="checkbox"]:active + label span {
      background-color: ${clrs.buttonPressedBorderColor};
    }

    td.selected,
    td.selected:hover,
    li.selected:hover,
    li.selected {
      color: white;
      background-color: ${clrs.highlightColor};
    }

    .sdpi-file-label > label:active,
    .sdpi-file-label.file:active,
    label.sdpi-file-label:active,
    label.sdpi-file-info:active,
    input[type="file"]::-webkit-file-upload-button:active,
    button:active {
      background-color: ${clrs.buttonPressedBackgroundColor};
      color: ${clrs.buttonPressedTextColor};
      border-color: ${clrs.buttonPressedBorderColor};
    }

    ::-webkit-progress-value,
    meter::-webkit-meter-optimum-value {
        background: linear-gradient(${clr2}, ${clr1} 20%, ${clr} 45%, ${clr} 55%, ${clr2})
    }

    ::-webkit-progress-value:active,
    meter::-webkit-meter-optimum-value:active {
        background: linear-gradient(${clr}, ${clr2} 20%, ${metersActiveColor} 45%, ${metersActiveColor} 55%, ${clr})
    }
    `;
    document.body.appendChild(node);
}

/** UTILITIES */

/*
    Quick utility to lighten or darken a color (doesn't take color-drifting, etc. into account)
    Usage:
    fadeColor('#061261', 100); // will lighten the color
    fadeColor('#200867'), -100); // will darken the color
*/
function fadeColor(clr: string, amt: number): string {
    const min = Math.min,
        max = Math.max;
    const num = parseInt(clr.replace(/#/g, ''), 16);
    const r = min(255, max((num >> 16) + amt, 0));
    const g = min(255, max((num & 0x0000FF) + amt, 0));
    const b = min(255, max(((num >> 8) & 0x00FF) + amt, 0));
    return '#' + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
}

// Type Assertions
function isCheckbox(elem: unknown): elem is HTMLInputElement {
    return (elem as HTMLInputElement).classList.contains("sdCheckBox");
}

function isFile(elem: unknown): elem is HTMLInputElement {
    return (elem as HTMLInputElement).classList.contains("sdFile");
}

function isList(elem: unknown): elem is HTMLSelectElement {
    return (elem as HTMLSelectElement).classList.contains("sdList");
}

function isHTML(elem: unknown): elem is HTMLElement {
    return (elem as HTMLElement).classList.contains("sdHTML");
}

// Interfaces and Types
type SDPlatform = "mac" | "windows";
type SDLanguage = "en" | "fr" | "de" | "es" | "ja" | "zh_CN";
enum SDDeviceEnum {
    StreamDeck,
    StreamDeckMini,
    StreamDeckXL,
    StreamDeckMobile
}
type SDDeviceType =
    SDDeviceEnum.StreamDeck |
    SDDeviceEnum.StreamDeckMini |
    SDDeviceEnum.StreamDeckXL |
    SDDeviceEnum.StreamDeckMobile;
interface SDCoords {
    column: number;
    row: number;
}
interface SDDevice {
    id: string;
    type: SDDeviceType;
    name: string;
    size: {
        columns: number;
        rows: number;
    };
}
interface ColorsInfo {
    mouseDownColor: string;
    highlightColor: string;
    buttonPressedBorderColor: string;
    buttonPressedBackgroundColor: string;
    buttonPressedTextColor: string;
}
interface InInfo {
    application: {
        language: SDLanguage;
        platform: SDPlatform;
        version: string;
    };
    plugin: {
        version: string;
    };
    devices: SDDevice[];
    devicePixelRatio: number;
    colors?: ColorsInfo;
}
interface InActionInfo {
    action: string;
    context: string;
    device: string;
    payload: {
        settings: object;
        coordinates: SDCoords;
    };
}