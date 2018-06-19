/**
Template Controllers

@module Templates
*/

/**
The request account popup window template

@class [template] popupWindows_requestEthAccount
@constructor
*/

Template['popupWindows_requestEthAccount'].onRendered(function () {
    this.$('input.account').focus();
    TemplateVar.set('showPassword', false);
    TemplateVar.set('passwordLow', false);
    TemplateVar.set('passwordRepat', false);
});

Template['popupWindows_requestEthAccount'].helpers({
    'passwordInputType': function () {
        return TemplateVar.get('showPassword') ? 'text' : 'password';
    }
});

Template['popupWindows_requestEthAccount'].events({
    'click .cancel': function () {
        ipc.send('backendAction_closePopupWindow');
    },

    'click #close-window': function () {
        TemplateVar.set('creating', false);
        ipc.send('backendAction_closePopupWindow');

    },

    'click .showPassIco': function () {
        TemplateVar.set('showPassword', !TemplateVar.get('showPassword'));
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
        var pw = template.find('input.password').value;
        var pwRepeat = template.find('input.password-repeat').value;

        if (!(pw) ||(pw && pw.length < 8)) {
            TemplateVar.set('passwordLow', true);
        } else if ( pw !== pwRepeat) {
            TemplateVar.set('passwordRepat', true);
        }  else if (pw && pw.length >= 8) {

            TemplateVar.set('creating', true);
            TemplateVar.set('created', false);

            ipc.send('backendAction_createEthAccount', pwRepeat);

            ipc.on('uiAction_checkedEthAccount', function (ev) {
                TemplateVar.set(template, 'created', true);
                ipc.send('backendAction_closePopupWindow');
            });

            TemplateVar.set('password-repeat', false);
            template.find('input.account').value = '';
            template.find('input.password-repeat').value = '';
            template.find('input.password').value = '';
            pw = pwRepeat = null;

        }
   }
});
