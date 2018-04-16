/**
 Template Controllers
 @module Templates
 */

/**
 The request privateKey popup window template
 @class [template] popupWindows_requestPrivateKey
 @constructor
 */

Template['popupWindows_requestPrivateKey'].onRendered(function () {
    this.$('input.privateKey').focus();
    TemplateVar.set('showPassword', false);
});

Template['popupWindows_requestPrivateKey'].helpers({
    'passwordInputType': function () {
        return TemplateVar.get('showPassword') ? 'text' : 'password';
    }
});

Template['popupWindows_requestPrivateKey'].events({
    'click .cancel': function () {
        ipc.send('backendAction_closePopupWindow');
    },
    'click .show-password': function (e) {
        TemplateVar.set('showPassword', e.currentTarget.checked);
    },
    'submit form': function (e, template) {
        e.preventDefault();
        //cranelv add PrivateKey name input 2017-11-14
        var privateKey1 = template.find('input.privateKey').value;
        var pw = template.find('input.password').value;
        var pwRepeat = template.find('input.password-repeat').value;
        ipc.on('uiAction_keyConvertDone', function (e, address) {
            console.log("address:", address);
        });
        // ask for password repeat
        // check passwords
        if(privateKey1 && privateKey1.length< 2){
            GlobalNotification.warning({
                content: "Make a longer name",
                duration: 3
            });
        }
        else if ( pw !== pwRepeat) {
            GlobalNotification.warning({
                content: TAPi18n.__('mist.popupWindows.requestPrivateKey.errors.passwordMismatch'),
                duration: 3
            });
        } else if (pw && pw.length < 8) {
            GlobalNotification.warning({
                content: TAPi18n.__('mist.popupWindows.requestPrivateKey.errors.passwordTooShort'),
                duration: 3
            });
        } else if (pw && pw.length >= 8) {

            TemplateVar.set('creating', true);
            setTimeout((e)=>{
                console.log("pwRepeat:", pwRepeat);
            ipc.send('wan_convertKey', privateKey1, pwRepeat);
            template.find('input.password').value = '';
            pw = null;
        }, 1000);
        }

        TemplateVar.set('password-repeat', false);
        template.find('input.privateKey').value = '';
        template.find('input.password-repeat').value = '';
        template.find('input.password').value = '';
    }
});
