exports.Keyboard_Generic = Keyboard_Generic;

function Keyboard_Generic(clientConnection, deviceConnection) {
	this.DEVICE_TYPE = 'type_keyboard';
	this.DEVICE_GROUP = 'group_hid';

	this.DEVICE_ERROR = 'DRIVER_ERROR';
	this.KEY_DOWN = 1;
	this.KEY_UP = 2;
	this.VK_ENTER = 0x0D;
	this.MAX_LENGTH = 160;

	this.clientConnection = clientConnection;
	this.prefix = new Array();
	this.inputString = '';
	this.pressedPrefix = -1;
}

Keyboard_Generic.prototype = {
	onDeviceData : function(event, keycode, ascii) {
		if ( event == this.KEY_UP ){
			return;
		}
		try {
			var data =  null;
			if( this.pressedPrefix == -1 ) {
				// It is confirmed whether input data is a prefix. 
				for(var i=0; i<this.prefix.length; i++) {
					if( this.prefix[i] == keycode ) {
						this.pressedPrefix = keycode;
						return;
					}
				}
				// When input data is not a prefix, input data is transmitted.
				data = {'keycode' : keycode};
				if ((ascii != null) && (ascii != '')) {
					data['ascii'] =  ascii;
				}
				this.clientConnection.send('onkeypress', data);
			}

			// When CR was detected or it reaches a set number of character, it transmits.
			else if( (keycode == this.VK_ENTER) || (this.inputString.length > this.MAX_LENGTH) ) {
				data = {'input' : this.inputString, 'prefix' : this.pressedPrefix};
				this.clientConnection.send('onstring', data);
				this.inputString = '';
				this.pressedPrefix = -1;
			}
			// The character is accumulated.
			else if ((ascii != null) && (ascii != '')) {
				this.inputString += ascii;
			}
		}
		catch(e) {
			this.clientConnection.sendError( this.DEVICE_ERROR, null, '0');
		}
	},

	setprefix : function(data) {
		try {
			var keycodes = data.keycodes;
			// The prefix is registered.  
			var numcode = new Array();
			for (var i = 0; i < keycodes.length; i++) {
				numcode[i] = parseInt(keycodes[i], 10);
			}
			this.prefix = numcode;
		}
		catch(e) {
			this.clientConnection.sendError( this.DEVICE_ERROR, null, '0');
		}
	}
};
