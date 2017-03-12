//https://github.com/slimjack/ExtJs-Utils

Ext.define('Ext.ux.plugin.ExternalValidating', {
    alias: 'plugin.externalvalidating',
    extend: 'Ext.AbstractPlugin',

    init: function (formField) {
        var me = this;
        var externalErrors = {};
        var ignoreExternal = false;
        if (!formField.isFormField) {
            Ext.Error.raise('ExternalValidating plugin may be applied only to form fields');
        }

        if (Ext.isString(formField.valuePublishEvent)) {
            formField.un(formField.valuePublishEvent, formField.publishValue, formField);
        } else {
            for (var i = 0, len = formField.valuePublishEvent.length; i < len; ++i) {
                formField.un(formField.valuePublishEvent[i], formField.publishValue, formField);
            }
        }

        Ext.override(formField, {
            publishValue: function () {
                var me = this;

                if (me.rendered && !me.getInternalErrors().length) {
                    me.publishState('value', me.getValue());
                }
            },

            getErrors: function () {
                var errors = this.callParent(arguments);
                if (!ignoreExternal) {
                    Ext.Object.each(externalErrors, function (sourceName, errorMessages) {
                        errors = errors.concat(errorMessages);
                    });
                }
                return errors;
            },

            getInternalErrors: function () {
                ignoreExternal = true;
                var result = this.getErrors();
                ignoreExternal = false;
                return result;
            },

            setExternalErrors: function (sourceName, errorMessages) {
                externalErrors[sourceName] = errorMessages || [];
                formField.validate();
            }
        });

        if (Ext.isString(formField.valuePublishEvent)) {
            formField.on(formField.valuePublishEvent, formField.publishValue, formField);
        } else {
            for (i = 0, len = formField.valuePublishEvent.length; i < len; ++i) {
                formField.on(formField.valuePublishEvent[i], formField.publishValue, formField);
            }
        }
    }
});