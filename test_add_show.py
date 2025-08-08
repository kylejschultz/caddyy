#!/usr/bin/env python3

import requests
import json
import os

API_BASE = "http://localhost:8000"

def test_add_show_with_folders():
    """Test adding a TV show with folder creation."""
    
    print("🧪 Testing TV show addition with folder creation...")
    
    # Test data - using a popular show
    tmdb_id = 60735  # The Flash
    library_path = "/Users/kyle/kdev/media/tv"
    
    # First, check if show already exists and clean up if needed
    print("📡 Checking existing shows...")
    response = requests.get(f"{API_BASE}/api/collection/tv")
    existing_shows = response.json()
    
    for show in existing_shows:
        if show['tmdb_id'] == tmdb_id:
            print(f"🧹 Cleaning up existing show: {show['title']}")
            requests.delete(f"{API_BASE}/api/collection/tv/{show['id']}?delete_from_disk=true")
    
    # Add the show with folder creation
    print(f"➕ Adding show with TMDB ID {tmdb_id}...")
    
    params = {
        'tmdb_id': tmdb_id,
        'library_path': library_path,
        'create_folder': True
    }
    
    response = requests.post(f"{API_BASE}/api/collection/tv", params=params)
    
    if response.status_code == 200:
        data = response.json()
        print("✅ Show added successfully!")
        print(f"   Title: {data.get('title', 'Unknown')}")
        print(f"   Folder Path: {data.get('folder_path', 'None')}")
        print(f"   Folder Created: {data.get('folder_created', False)}")
        
        # Verify the folder exists
        folder_path = data.get('folder_path')
        if folder_path and os.path.exists(folder_path):
            print(f"✅ Folder verified to exist: {folder_path}")
            
            # List season folders
            seasons = [d for d in os.listdir(folder_path) if d.startswith('Season')]
            print(f"   Season folders created: {sorted(seasons)}")
        else:
            print(f"❌ Folder not found: {folder_path}")
        
        # Verify the show appears in collection with folder_path
        print("📡 Verifying show appears in collection...")
        collection_response = requests.get(f"{API_BASE}/api/collection/tv")
        collection_shows = collection_response.json()
        
        added_show = next((s for s in collection_shows if s['tmdb_id'] == tmdb_id), None)
        if added_show and added_show.get('folder_path'):
            print("✅ Show found in collection with folder_path!")
        else:
            print("❌ Show not found in collection or missing folder_path")
            
        # Clean up
        print("🧹 Cleaning up test data...")
        requests.delete(f"{API_BASE}/api/collection/tv/{data['id']}?delete_from_disk=true")
        
    else:
        print(f"❌ Failed to add show: {response.status_code}")
        print(response.text)

def test_library_paths():
    """Test library path configuration."""
    print("\n📁 Testing library path configuration...")
    
    response = requests.get(f"{API_BASE}/api/collection/library/tv/paths")
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Found {data['total']} configured library paths:")
        for path in data['paths']:
            print(f"   - {path['name']}: {path['path']} (enabled: {path['enabled']})")
    else:
        print(f"❌ Failed to get library paths: {response.status_code}")

if __name__ == "__main__":
    print("🚀 Testing Caddyy TV Show Addition\n")
    
    try:
        test_library_paths()
        test_add_show_with_folders()
        print("\n✅ All tests completed!")
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
