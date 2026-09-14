import pytest
from unittest.mock import patch, MagicMock
from src.data.connector import (
    NeuPrintConnector,
    AuthenticationError,
    DatasetNotFoundError,
    UpstreamTimeoutError,
    UpstreamUnavailableError,
    RealDataUnavailableError
)
import os

@pytest.fixture
def mock_env():
    with patch.dict(os.environ, {"NEUROFLY_ENV": "research"}):
        yield

@patch("src.config.Config.NEUPRINT_TOKEN", "mock_token")
@patch("src.config.Config.NEUPRINT_DATASET", "male-cns:v1.0")
@patch("src.data.connector.time.sleep") # Mock sleep to speed up tests
def test_authentication_error(mock_sleep, mock_env):
    with patch("neuprint.Client", side_effect=Exception("Returned Error (401)")):
        with pytest.raises(AuthenticationError):
            NeuPrintConnector(max_retries=1)

@patch("src.config.Config.NEUPRINT_TOKEN", "mock_token")
@patch("src.config.Config.NEUPRINT_DATASET", "male-cns:v1.0")
@patch("src.data.connector.time.sleep")
def test_dataset_not_found(mock_sleep, mock_env):
    with patch("neuprint.Client", side_effect=Exception("Returned Error (404)")):
        with pytest.raises(DatasetNotFoundError):
            NeuPrintConnector(max_retries=1)

@patch("src.config.Config.NEUPRINT_TOKEN", "mock_token")
@patch("src.config.Config.NEUPRINT_DATASET", "male-cns:v1.0")
@patch("src.data.connector.time.sleep")
def test_upstream_timeout(mock_sleep, mock_env):
    with patch("neuprint.Client", side_effect=Exception("Returned Error (504)")):
        with pytest.raises(UpstreamTimeoutError):
            NeuPrintConnector(max_retries=3, base_backoff_sec=0.1)
    
    # Assert sleep was called twice (for 3 retries)
    assert mock_sleep.call_count == 2

@patch("src.config.Config.NEUPRINT_TOKEN", "mock_token")
@patch("src.config.Config.NEUPRINT_DATASET", "male-cns:v1.0")
@patch("src.data.connector.time.sleep")
def test_upstream_unavailable(mock_sleep, mock_env):
    with patch("neuprint.Client", side_effect=Exception("Returned Error (502)")):
        with pytest.raises(UpstreamTimeoutError):
            NeuPrintConnector(max_retries=2, base_backoff_sec=0.1)

@patch("src.config.Config.NEUPRINT_TOKEN", "")
@patch("src.config.Config.NEUPRINT_DATASET", "male-cns:v1.0")
def test_missing_credentials(mock_env):
    with pytest.raises(AuthenticationError):
        NeuPrintConnector(max_retries=1)

@patch("src.config.Config.NEUPRINT_TOKEN", "mock_token")
@patch("src.config.Config.NEUPRINT_DATASET", "male-cns:v1.0")
def test_development_fixture_bypasses_auth():
    with patch.dict(os.environ, {"NEUROFLY_ENV": "development"}):
        connector = NeuPrintConnector()
        assert connector.client is None
