"""Typed pipeline errors. Exceeding a budget fails the generation with a
typed error, never a silent retry."""


class GenerationError(Exception):
    code = "generation_error"

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class BudgetExceededError(GenerationError):
    code = "budget_exceeded"


class ModelJsonError(GenerationError):
    code = "bad_model_json"


class UnrepairableScriptError(GenerationError):
    code = "unrepairable_script"


class ValidatorBridgeError(GenerationError):
    code = "validator_bridge_failed"


class ModelAuthError(GenerationError):
    code = "model_auth_failed"
