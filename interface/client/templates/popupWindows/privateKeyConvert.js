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
    TemplateVar.set('isAgree', false);
    TemplateVar.set('showReminder', false);
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

    'click .dapp-primary-button': function (e) {
        TemplateVar.set('isAgree', true);
    },

    'click #close-window': function () {
        TemplateVar.set('creating', false);
        ipc.send('backendAction_closePopupWindow');

    },

    'click .reminder': function (e) {
        TemplateVar.set('showReminder', e.currentTarget.checked);
    },

    'click .showPassIco': function () {
        TemplateVar.set('showPassword', !TemplateVar.get('showPassword'));
    },

    'focus .account': function () {
        TemplateVar.set('accountLow', false);
    },

    'input .password-check': function (e, template) {
        var pw = template.find('input.password').value;

        if (pw && pw.length >= 8) {
            var reminder = e.target.value;

            if (reminder === pw) {
                TemplateVar.set('reminderRisk', true);
            }
        }
    },

    'focus .password': function () {
        TemplateVar.set('passwordLow', false);
    },

    'focus .password-repeat': function () {
        TemplateVar.set('passwordRepat', false);
    },

    'submit form': function (e, template) {
        e.preventDefault();
        //cranelv add PrivateKey name input 2017-11-14
        var privateKey1 = template.find('input.account').value;
        var pw = template.find('input.password').value;
        var pwRepeat = template.find('input.password-repeat').value;
        ipc.on('uiAction_keyConvertDone', function (e, address) {
            console.log("address:", address);
        });
        // ask for password repeat
        // check passwords
        if(privateKey1 && privateKey1.length !== 64){
            GlobalNotification.warning({
                content: "private key invalid!",
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
