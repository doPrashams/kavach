"""Typed application exceptions."""


class KavachError(Exception):
    """Base exception for Kavach backend."""


class ConfigError(KavachError):
    """Configuration-related errors."""


class DataHubError(KavachError):
    """DataHub integration errors."""


class AgentError(KavachError):
    """Agent execution errors."""


class FixerError(KavachError):
    """Fixer / codegen errors."""
