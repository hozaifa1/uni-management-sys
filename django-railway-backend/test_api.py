"""
Simple script to test API endpoints
Run Django server first: python manage.py runserver
"""
import requests
import json

BASE_URL = 'http://localhost:8000'

def test_api_root():
    """Test API root endpoint"""
    print("Testing API root...")
    response = requests.get(f'{BASE_URL}/')
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}\n")
    return response.status_code == 200

def test_jwt_token():
    """Test JWT token generation"""
    print("Testing JWT token generation...")
    response = requests.post(
        f'{BASE_URL}/api/token/',
        json={
            'username': 'admin',
            'password': 'admin123'
        }
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Access token received: {data['access'][:50]}...")
        print(f"Refresh token received: {data['refresh'][:50]}...\n")
        return data['access']
    else:
        print(f"Error: {response.json()}\n")
        return None

def test_users_list(token):
    """Test users list endpoint"""
    print("Testing users list endpoint...")
    headers = {
        'Authorization': f'Bearer {token}'
    }
    response = requests.get(f'{BASE_URL}/api/accounts/users/', headers=headers)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Users count: {data['count']}")
        print(f"Response: {json.dumps(data, indent=2)}\n")
    else:
        print(f"Error: {response.text}\n")
    return response.status_code == 200

def test_courses_list(token):
    """Test courses list endpoint"""
    print("Testing courses list endpoint...")
    headers = {
        'Authorization': f'Bearer {token}'
    }
    response = requests.get(f'{BASE_URL}/api/students/courses/', headers=headers)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Courses count: {data['count']}")
        print(f"Response: {json.dumps(data, indent=2)}\n")
    else:
        print(f"Error: {response.text}\n")
    return response.status_code == 200

def main():
    """Run all tests"""
    print("=" * 60)
    print("IGMIS LMS API Testing")
    print("=" * 60)
    print()
    
    try:
        # Test 1: API root
        if not test_api_root():
            print("❌ API root test failed!")
            return
        
        print("✅ API root test passed!")
        print()
        
        # Test 2: JWT token
        token = test_jwt_token()
        if not token:
            print("❌ JWT token test failed!")
            return
        
        print("✅ JWT token test passed!")
        print()
        
        # Test 3: Users list
        if not test_users_list(token):
            print("❌ Users list test failed!")
            return
        
        print("✅ Users list test passed!")
        print()
        
        # Test 4: Courses list
        if not test_courses_list(token):
            print("❌ Courses list test failed!")
            return
        
        print("✅ Courses list test passed!")
        print()
        
        print("=" * 60)
        print("✅ All API tests passed!")
        print("=" * 60)
        
    except requests.exceptions.ConnectionError:
        print("❌ Error: Could not connect to Django server.")
        print("Please make sure the server is running:")
        print("python manage.py runserver")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

if __name__ == '__main__':
    main()



