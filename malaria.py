from flask import Flask, request, jsonify
from PIL import Image
import numpy as np
import tensorflow as tf
from flask_cors import CORS
from io import BytesIO
import cv2


app = Flask(__name__)
CORS(app, origins="http://localhost:3000")


model = tf.keras.models.load_model('./prediction/malaria_cnn_model.h5')


def preprocess_image(image):
    image = image.resize((50, 50))
    image_array = np.array(image)
    image_array = image_array / 255.0
    image_array = np.expand_dims(image_array, axis=0)

    return image_array



@app.route('/predict', methods=['POST'])
def predict():
    file = request.files['image']
    img_bytes = file.read()
    img_array = np.frombuffer(img_bytes, dtype=np.uint8)
    img = cv2.imdecode(img_array, flags=cv2.IMREAD_COLOR)
    image_array = Image.fromarray(img, 'RGB')
    pimage = preprocess_image(image_array)  
    prediction = model.predict(pimage)
    idx_1 = prediction[0]
    print(idx_1)
    result = idx_1[0]
    print(result)
    
    if result >= 0.5 :
        res = 'Parasitized'
    else :
        res = 'Uninfected'
    
    return jsonify({'prediction': res})


if __name__ == '__main__':
    app.run(debug=True)