# streamdeck-easypi

This library is meant to simplify the communication between the Property Inspector and your plugin.
By sticking to a few guidelines, the library will own setting and getting the various settings for your plugin.

## Early Availability Version
Note: This library is still being updated. Make sure to follow this repository or follow my [twitter/discord](http://barraider.github.io) updates to get notified when it changes.


## Usage
### Common Use-case
This section is relevant for the majority of controls. There are a few different controls (such as the CheckBox or FilePicker) that require additional steps, as indicated below.
Example:
```
<input class="sdProperty" id="lastName" oninput="setSettings()">

 <select class="sdProperty" id="refreshSeconds" oninput="setSettings()">
	<option value="1">1 Second</option>
	<option value="15">15 Seconds</option>
	<option value="30">30 Seconds</option>
</select>

```

There are three things needed for the library to work correctly (as demonstrated in the example above):
1. Each property must have an ***id*** field. The id must be identical to the name of the property in the payload. In the example above, the library will pass two settings, one named ***lastName*** and one named ***refreshSeconds***. The library will also look for those names to populate the values when new data is received.

2. The property must also have a class called ***sdProperty***. The control can have additional classes too, but this one must be there.

3. Add an ***oninput="setSettings()"*** section to the control, to ensure settings are saved as soon as a user changes input.

### CheckBox
To get data to and from checkboxes add an additional class named **sdCheckbox** _in addition_ to the sdProperty indicated above.

```
<input id="enterMode" type="checkbox" class="sdProperty sdCheckbox" oninput="setSettings()">
```

### FilePicker
To support filepickers, as recommended in the SDK follow the following guidelines:

```
<input class="sdProperty sdFile" type="file" id="userImage" oninput="setSettings()">
<label class="sdpi-file-info " for="userImage1" id="userImageFilename">No file...</label>
```

1. On the input class, add an additional class named **sdFile** _in addition_ to the sdProperty indicated above.
2. Add a label, as indicated above. Make sure the Id of the label has a ***Filename*** suffix (If the input is called userImage than the label is named userImageFilename)


