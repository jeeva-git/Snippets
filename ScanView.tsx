/* 
This file is reference for implementing scan functionality in Zebra device
npm i react-native-datawedge-intents then use this file 
*/

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    FlatList,
    TouchableHighlight,
    StyleSheet,
} from 'react-native';
import { CheckBox, Button } from 'react-native-elements';
import DataWedgeIntents from 'react-native-datawedge-intents';

const ScanView = () => {
    const [ean8checked, setEan8Checked] = useState(true);
    const [ean13checked, setEan13Checked] = useState(true);
    const [code39checked, setCode39Checked] = useState(true);
    const [code128checked, setCode128Checked] = useState(true);
    const [lastApiVisible, setLastApiVisible] = useState(false);
    const [lastApiText, setLastApiText] = useState("Messages from DataWedge will go here");
    const [checkBoxesDisabled, setCheckBoxesDisabled] = useState(true);
    const [scanButtonVisible, setScanButtonVisible] = useState(false);
    const [dwVersionText, setDwVersionText] = useState("Pre 6.3.  Please create and configure profile manually.  See the ReadMe for more details");
    const [dwVersionTextStyle, setDwVersionTextStyle] = useState(styles.itemTextAttention);
    const [activeProfileText, setActiveProfileText] = useState("Requires DataWedge 6.3+");
    const [enumeratedScannersText, setEnumeratedScannersText] = useState("Requires DataWedge 6.3+");
    const [scans, setScans] = useState([]);
    const [sendCommandResult, setSendCommandResult] = useState("false");

    useEffect(() => {
        const deviceEmitterSubscription = DeviceEventEmitter.addListener('datawedge_broadcast_intent', (intent) => broadcastReceiver(intent));
        registerBroadcastReceiver();
        determineVersion();

        return () => {
            deviceEmitterSubscription.remove();
        };
    }, []);

    const _onPressScanButton = () => {
        sendCommand("com.symbol.datawedge.api.SOFT_SCAN_TRIGGER", 'TOGGLE_SCANNING');
    };

    const determineVersion = () => {
        sendCommand("com.symbol.datawedge.api.GET_VERSION_INFO", "");
    };

    const setDecoders = () => {
        // Set the new configuration
        const profileConfig = {
            "PROFILE_NAME": "ZebraReactNativeDemo",
            "PROFILE_ENABLED": "true",
            "CONFIG_MODE": "UPDATE",
            "PLUGIN_CONFIG": {
                "PLUGIN_NAME": "BARCODE",
                "PARAM_LIST": {
                    //"current-device-id": this.selectedScannerId,
                    "scanner_selection": "auto",
                    "decoder_ean8": "" + ean8checked,
                    "decoder_ean13": "" + ean13checked,
                    "decoder_code128": "" + code128checked,
                    "decoder_code39": "" + code39checked,
                },
            },
        };
        sendCommand("com.symbol.datawedge.api.SET_CONFIG", profileConfig);
    };

    const sendCommand = (extraName, extraValue) => {
        console.log("Sending Command: " + extraName + ", " + JSON.stringify(extraValue));
        const broadcastExtras = {};
        broadcastExtras[extraName] = extraValue;
        broadcastExtras["SEND_RESULT"] = sendCommandResult;
        DataWedgeIntents.sendBroadcastWithExtras({
            action: "com.symbol.datawedge.api.ACTION",
            extras: broadcastExtras,
        });
    };

    const registerBroadcastReceiver = () => {
        DataWedgeIntents.registerBroadcastReceiver({
            filterActions: [
                'com.zebra.reactnativedemo.ACTION',
                'com.symbol.datawedge.api.RESULT_ACTION',
            ],
            filterCategories: ['android.intent.category.DEFAULT'],
        });
    };

    const broadcastReceiver = (intent) => {
        console.log('Received Intent: ' + JSON.stringify(intent));
        if (intent.hasOwnProperty('RESULT_INFO')) {
            const commandResult =
                intent.RESULT +
                ' (' +
                intent.COMMAND.substring(intent.COMMAND.lastIndexOf('.') + 1, intent.COMMAND.length) +
                ')';
            commandReceived(commandResult.toLowerCase());
        }

        if (intent.hasOwnProperty('com.symbol.datawedge.api.RESULT_GET_VERSION_INFO')) {
            const versionInfo = intent['com.symbol.datawedge.api.RESULT_GET_VERSION_INFO'];
            console.log('Version Info: ' + JSON.stringify(versionInfo));
            const datawedgeVersion = versionInfo['DATAWEDGE'];
            console.log("Datawedge version: " + datawedgeVersion);

            if (datawedgeVersion >= "06.3") datawedge63();
            if (datawedgeVersion >= "06.4") datawedge64();
            if (datawedgeVersion >= "06.5") datawedge65();
        } else if (intent.hasOwnProperty('com.symbol.datawedge.api.RESULT_ENUMERATE_SCANNERS')) {
            const enumeratedScannersObj = intent['com.symbol.datawedge.api.RESULT_ENUMERATE_SCANNERS'];
            enumerateScanners(enumeratedScannersObj);
        } else if (intent.hasOwnProperty('com.symbol.datawedge.api.RESULT_GET_ACTIVE_PROFILE')) {
            const activeProfileObj = intent['com.symbol.datawedge.api.RESULT_GET_ACTIVE_PROFILE'];
            activeProfile(activeProfileObj);
        } else if (!intent.hasOwnProperty('RESULT_INFO')) {
            barcodeScanned(intent, new Date().toLocaleString());
        }
    };

    const datawedge63 = () => {
        console.log("Datawedge 6.3 APIs are available");
        sendCommand("com.symbol.datawedge.api.CREATE_PROFILE", "ZebraReactNativeDemo");
        setDwVersionText("6.3.  Please configure profile manually.  See ReadMe for more details.");
        sendCommand("com.symbol.datawedge.api.GET_ACTIVE_PROFILE", "");
        sendCommand("com.symbol.datawedge.api.ENUMERATE_SCANNERS", "");
        setScanButtonVisible(true);
    };

    const datawedge64 = () => {
        console.log("Datawedge 6.4 APIs are available");
        setDwVersionText("6.4.");
        setDwVersionTextStyle(styles.itemText);
        setCheckBoxesDisabled(false);
        const profileConfig = {
            "PROFILE_NAME": "ZebraReactNativeDemo",
            "PROFILE_ENABLED": "true",
            "CONFIG_MODE": "UPDATE",
            "PLUGIN_CONFIG": {
                "PLUGIN_NAME": "BARCODE",
                "RESET_CONFIG": "true",
                "PARAM_LIST": {},
            },
            "APP_LIST": [
                {
                    "PACKAGE_NAME": "com.amzmobile",
                    "ACTIVITY_LIST": ["*"],
                },
            ],
        };
        sendCommand("com.symbol.datawedge.api.SET_CONFIG", profileConfig);

        const profileConfig2 = {
            "PROFILE_NAME": "ZebraReactNativeDemo",
            "PROFILE_ENABLED": "true",
            "CONFIG_MODE": "UPDATE",
            "PLUGIN_CONFIG": {
                "PLUGIN_NAME": "INTENT",
                "RESET_CONFIG": "true",
                "PARAM_LIST": {
                    "intent_output_enabled": "true",
                    "intent_action": "com.zebra.reactnativedemo.ACTION",
                    "intent_delivery": "2",
                },
            },
        };
        sendCommand("com.symbol.datawedge.api.SET_CONFIG", profileConfig2);

        setTimeout(() => {
            sendCommand("com.symbol.datawedge.api.GET_ACTIVE_PROFILE", "");
        }, 1000);
    };

    const datawedge65 = () => {
        console.log("Datawedge 6.5 APIs are available");
        setDwVersionText("6.5 or higher.");
        setSendCommandResult("true");
        setLastApiVisible(true);
    };

    const commandReceived = (commandText) => {
        setLastApiText(commandText);
    };

    const enumerateScanners = (enumeratedScanners) => {
        let humanReadableScannerList = "";
        for (let i = 0; i < enumeratedScanners.length; i++) {
            console.log("Scanner found: name= " + enumeratedScanners[i].SCANNER_NAME + ", id=" + enumeratedScanners[i].SCANNER_INDEX + ", connected=" + enumeratedScanners[i].SCANNER_CONNECTION_STATE);
            humanReadableScannerList += enumeratedScanners[i].SCANNER_NAME;
            if (i < enumeratedScanners.length - 1)
                humanReadableScannerList += ", ";
        }
        setEnumeratedScannersText(humanReadableScannerList);
    };

    const activeProfile = (theActiveProfile) => {
        setActiveProfileText(theActiveProfile);
    };

    const barcodeScanned = (scanData, timeOfScan) => {
        const scannedData = scanData["com.symbol.datawedge.data_string"];
        console.log("🚀 ~ file: SignInScreen.tsx:247 ~ SignInScreen ~ barcodeScanned ~ scannedData:", scannedData);
        const scannedType = scanData["com.symbol.datawedge.label_type"];
        console.log("Scan: " + scannedData);
        const newScans = [
            { data: scannedData, decoder: scannedType, timeAtDecode: timeOfScan },
            ...scans,
        ];
        setScans(newScans);
    };

    return (
        <ScrollView>
            <View style={styles.container}>
                <Text style={styles.h3}>Information / Configuration</Text>
                <Text style={styles.itemHeading}>DataWedge version:</Text>
                <Text style={dwVersionTextStyle}>{dwVersionText}</Text>
                <Text style={styles.itemHeading}>Active Profile</Text>
                <Text style={styles.itemText}>{activeProfileText}</Text>
                {lastApiVisible && <Text style={styles.itemHeading}>Last API message</Text>}
                {lastApiVisible && <Text style={styles.itemText}>{lastApiText}</Text>}
                <Text style={styles.itemHeading}>Available scanners:</Text>
                <Text style={styles.itemText}>{enumeratedScannersText}</Text>
                <View style={{ flexDirection: 'row', flex: 1 }}>
                    <CheckBox
                        title='EAN 8'
                        checked={ean8checked}
                        disabled={checkBoxesDisabled}
                        onPress={() => {
                            setEan8Checked(!ean8checked);
                            setDecoders();
                        }}
                    />
                    <CheckBox
                        title='EAN 13'
                        checked={ean13checked}
                        disabled={checkBoxesDisabled}
                        onPress={() => {
                            setEan13Checked(!ean13checked);
                            setDecoders();
                        }}
                    />
                </View>
                <View style={{ flexDirection: 'row', flex: 1 }}>
                    <CheckBox
                        title='Code 39'
                        checked={code39checked}
                        disabled={checkBoxesDisabled}
                        onPress={() => {
                            setCode39Checked(!code39checked);
                            setDecoders();
                        }}
                    />
                    <CheckBox
                        title='Code 128'
                        checked={code128checked}
                        disabled={checkBoxesDisabled}
                        onPress={() => {
                            setCode128Checked(!code128checked);
                            setDecoders();
                        }}
                    />
                </View>
                {scanButtonVisible && (
                    <Button
                        title='Scan'
                        color="#333333"
                        buttonStyle={{
                            backgroundColor: "#ffd200",
                            height: 45,
                            borderColor: "transparent",
                            borderWidth: 0,
                            borderRadius: 5,
                        }}
                        onPress={_onPressScanButton}
                    />
                )}
                <Text style={styles.itemHeading}>Scanned barcodes will be displayed here:</Text>
                <FlatList
                    data={scans}
                    keyExtractor={(item) => item.timeAtDecode}
                    renderItem={({ item, separators }) => (
                        <TouchableHighlight
                            onShowUnderlay={separators.highlight}
                            onHideUnderlay={separators.unhighlight}
                        >
                            <View
                                style={{
                                    backgroundColor: "#0077A0",
                                    margin: 10,
                                    borderRadius: 5,
                                }}
                            >
                                <View style={{ flexDirection: 'row', flex: 1 }}>
                                    <Text style={styles.scanDataHead}>{item.decoder}</Text>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.scanDataHeadRight}>{item.timeAtDecode}</Text>
                                    </View>
                                </View>
                                <Text style={styles.scanData}>{item.data}</Text>
                            </View>
                        </TouchableHighlight>
                    )}
                />
            </View>
        </ScrollView>
    );
};

export default ScanView;


const styles = StyleSheet.create({
    container: {
        flex: 1,
        //    justifyContent: 'center',
        //    alignItems: 'center',
        backgroundColor: '#F5FCFF',
    },
    instructions: {
        textAlign: 'center',
        color: '#333333',
        marginBottom: 5,
    },
    h1: {
        fontSize: 20,
        textAlign: 'center',
        margin: 5,
        fontWeight: "bold",
    },
    h3: {
        fontSize: 14,
        textAlign: 'center',
        margin: 10,
        fontWeight: "bold",
    },
    itemHeading: {
        fontSize: 12,
        textAlign: 'left',
        left: 10,
        fontWeight: "bold",
    },
    itemText: {
        fontSize: 12,
        textAlign: 'left',
        margin: 10,
    },
    itemTextAttention: {
        fontSize: 12,
        textAlign: 'left',
        margin: 10,
        backgroundColor: '#ffd200'
    },
    scanDataHead: {
        fontSize: 10,
        margin: 2,
        fontWeight: "bold",
        color: 'white',
    },
    scanDataHeadRight: {
        fontSize: 10,
        margin: 2,
        textAlign: 'right',
        fontWeight: "bold",
        color: 'white',
    },
    scanData: {
        fontSize: 16,
        fontWeight: "bold",
        textAlign: 'center',
        margin: 2,
        color: 'white',
    }
});