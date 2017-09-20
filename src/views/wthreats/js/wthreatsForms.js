'use strict';

var messages = {
  ENTER_THREAT_NAME: 'Please enter a name for this threat',
  ENTER_THREAT_DESCRIPTION: 'Please enter a description for this threat',
  VALID_LATLON: 'Enter latitude between 41 and 47, longitude between -125 and -116',
  VALID_URL: 'Please enter a valid url',
  IMG_CREDIT: 'Enter image credit or leave blank if no image url entered',
  URL_TITLE: 'Enter link title or leave blank if no url entered above',
  COMMIT_ERROR: 'Commit error, status ',
  REMOVE_ERROR: 'Remove error, status '
};

var formValidation = {
  wthreatUpdate: [
    {
      fieldId: '#threat-name',
      errorMsg: messages.ENTER_THREAT_NAME,
      isValid: function () {
        return ($(this.fieldId).val() === '') ? false : true;
        // return (!($(this.fieldId).val() === ''));
      }
    },
    {
      fieldId: '#threat-description',
      errorMsg: messages.ENTER_THREAT_DESCRIPTION,
      isValid: function () {
        return ($(this.fieldId).val() === '') ? false : true;
        // return !($(this.fieldId).val() === '');
      }
    },
    {
      fieldId: '#threat-lat',
      errorMsg: messages.VALID_LATLON,
      isValid: function () {
        if (/^(\-|\+)?([0-9]{0,5}(\.[0-9]{0,5})?)$/.test($(this.fieldId).val())) {
          var v = parseFloat($(this.fieldId).val());
          if (!isNaN(v)) {
            if (v >= 41 && v <= 47) return true;
          }
        }
        return false;
      }
    },
    {
      fieldId: '#threat-lon',
      errorMsg: messages.VALID_LATLON,
      isValid: function () {
        if (/^(\-|\+)?([0-9]{0,5}(\.[0-9]{0,5})?)$/.test($(this.fieldId).val())) {
          var v = parseFloat($(this.fieldId).val());
          if (!isNaN(v)) {
            if (v >= -125 && v <= -116) return true;
          }
        }
        return false;
      }
    },
    {
      fieldId: '#threat-img-url',
      errorMsg: messages.VALID_URL,
      isValid: function () {
        if ($(this.fieldId).val() === '') return true;
        // URL regex comes from this gist: https://gist.github.com/dperini/729294
        if (/^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:[/?#]\S*)?$/.test($(this.fieldId).val()))
        {
          return true;
        }
        return false;
      }
    },
    {
      fieldId: '#threat-img-credit',
      errorMsg: messages.IMG_CREDIT,
      isValid: function () {
        if ($('#threat-img-url').val() !== '') {
          return ($(this.fieldId).val() === '') ? false : true;
        } else {
          return ($(this.fieldId).val() === '');
        }
      }
    },
    {
      fieldId: '#threat-info-url-1',
      errorMsg: messages.VALID_URL,
      isValid: function () {
        if ($(this.fieldId).val() === '') return true;
        // URL regex comes from this gist: https://gist.github.com/dperini/729294
        if (/^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:[/?#]\S*)?$/.test($(this.fieldId).val()))
        {
          return true;
        }
        return false;
      }
    },
    {
      fieldId: '#threat-info-url-title-1',
      errorMsg: messages.URL_TITLE,
      isValid: function () {
        if ($('#threat-info-url-1').val() !== '') {
          return ($(this.fieldId).val() === '') ? false : true;
        } else {
          return ($(this.fieldId).val() === '');
        }
      }
    },
    {
      fieldId: '#threat-info-url-2',
      errorMsg: messages.VALID_URL,
      isValid: function () {
        if ($(this.fieldId).val() === '') return true;
        // URL regex comes from this gist: https://gist.github.com/dperini/729294
        if (/^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:[/?#]\S*)?$/.test($(this.fieldId).val()))
        {
          return true;
        }
        return false;
      }
    },
    {
      fieldId: '#threat-info-url-title-2',
      errorMsg: messages.URL_TITLE,
      isValid: function () {
        if ($('#threat-info-url-2').val() !== '') {
          return ($(this.fieldId).val() === '') ? false : true;
        } else {
          return ($(this.fieldId).val() === '');
        }
      }
    }
  ]
};

function displayErrorMessage(formName, fieldId, errorMessage) {
  $(fieldId).next().addClass('glyphicon-remove');
  $(fieldId).focus();
  $('#' + formName + 'ErrorText').text(errorMessage);
  $('#' + formName + 'Error').fadeIn('slow');
}

function cleanupErrorMarks() {
  $('.alert').hide();
  $('.form-control').next().removeClass('glyphicon-remove');
}

export function isValidForm(formName) {
  cleanupErrorMarks();
  for (var i = 0; i<formValidation[formName].length; i++) {
    if (!formValidation[formName][i].isValid()) {
      displayErrorMessage(formName, formValidation[formName][i].fieldId, formValidation[formName][i].errorMsg);
      return false;
    }
  }
  return true;
}
