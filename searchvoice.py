import speech_recognition as sr
import pandas as pd

# Load the CSV file
df = pd.read_csv('products.csv')

# Initialize the speech recognizer
r = sr.Recognizer()

# Use microphone as audio source
with sr.Microphone() as source:
    print("Say something!")
    audio = r.listen(source)

# Recognize speech using Google Speech Recognition API
try:
    query = r.recognize_google(audio)
    print("You said: " + query)

    # Search for the query in the CSV file
    result = df[df['column_name'].str.contains(query)]
    print(result)

except sr.UnknownValueError:
    print("Google Speech Recognition could not understand audio")
except sr.RequestError as e:
    print("Could not request results from Google Speech Recognition service; {0}".format(e))