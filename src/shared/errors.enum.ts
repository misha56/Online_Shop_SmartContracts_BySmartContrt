export enum ErrorsTypes {
  user_phone_number_used,
  user_email_used,
  user_confirmation_code_phone_number_invalid,
  user_resend_confirmation_code_number_of_attempts,
  user_confirmation_code_number_of_attempts,
  user_confirmation_code_email_invalid,
  user_signin_incorrect_data,
  user_edit_same_password,
  user_not_found,
  user_status_rejected,
  user_status_clarified,
  documents_upload_bad_request,
  documents_replace_bad_request,
  documents_zip_bad_request,
  documents_delete_bad_request,
  company_vat_unique,
  access_token_is_not_verified,
  recovery_email_invalid,
  otp_verification,
  validation_email_is_not_email,
  validation_field_can_not_be_empty,
  validation_password_do_not_match_regexp,
  validation_min_length,
  validation_employee_not_found,
  validation_field_not_string,
  validation_field_is_not_boolean,
  validation_field_is_not_number,
  validation_field_max_length,
  bank_account_already_exists,
  card_not_found,
  card_low_balance,
  card_bad_check_data,
  bank_account_does_not_exist,
  role_does_not_exist,
  role_already_exists,
  bad_permissions,
}
