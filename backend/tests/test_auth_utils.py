import uuid
from unittest.mock import MagicMock, patch

import pytest
from jose import jwt

from auth_utils import create_access_token, hash_password, verify_password
from config import settings
from models.user import RolEnum


class TestHashPassword:
    def test_returns_string(self):
        result = hash_password("mypassword123")
        assert isinstance(result, str)

    def test_hash_differs_from_plain(self):
        plain = "mypassword123"
        hashed = hash_password(plain)
        assert hashed != plain

    def test_different_calls_produce_different_hashes(self):
        h1 = hash_password("mypassword")
        h2 = hash_password("mypassword")
        assert h1 != h2


class TestVerifyPassword:
    def test_correct_password(self):
        plain = "securePassword!1"
        hashed = hash_password(plain)
        assert verify_password(plain, hashed) is True

    def test_wrong_password(self):
        hashed = hash_password("correctPassword")
        assert verify_password("wrongPassword", hashed) is False

    def test_empty_password(self):
        hashed = hash_password("")
        assert verify_password("", hashed) is True
        assert verify_password("notempty", hashed) is False


class TestCreateAccessToken:
    def test_returns_string(self):
        user_id = uuid.uuid4()
        token = create_access_token(user_id, RolEnum.alumno)
        assert isinstance(token, str)

    def test_token_contains_user_id(self):
        user_id = uuid.uuid4()
        token = create_access_token(user_id, RolEnum.maestro)
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        assert payload["sub"] == str(user_id)

    def test_token_contains_role(self):
        user_id = uuid.uuid4()
        token = create_access_token(user_id, RolEnum.alumno)
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        assert payload["rol"] == "alumno"

    def test_token_has_expiration(self):
        user_id = uuid.uuid4()
        token = create_access_token(user_id, RolEnum.admin)
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        assert "exp" in payload

    def test_different_roles(self):
        user_id = uuid.uuid4()
        for rol in RolEnum:
            token = create_access_token(user_id, rol)
            payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
            assert payload["rol"] == rol.value
